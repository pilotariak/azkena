/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer, } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport, } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { handleWellKnown, } from './discovery.js';
import { handleLanding, } from './handlers/landing.js';
import { registerTools, } from './tools/index.js';
import type { Env, } from './types.js';
import { VERSION, } from './version.js';

// ---------------------------------------------------------------------------
// Security & CORS helpers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': 'default-src \'none\'',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'MCP-Protocol-Version': '2026-07-28',
};

// CORS is open: all azkena data is public, no ambient credentials.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Method, Mcp-Name',
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1',],);

function isLoopback(hostname: string,): boolean {
  return LOOPBACK_HOSTS.has(hostname,);
}

// The published SDK (v1.x) only supports 2025-era protocol versions. We validate
// the real 2026-07-28 header ourselves, then present the SDK with this supported
// version so it dispatches the tool instead of rejecting the request.
const SUPPORTED_SDK_VERSION = '2025-11-25';

function withHeaders(response: Response,): Response {
  const headers = new Headers(response.headers,);
  for (const [k, v,] of Object.entries(SECURITY_HEADERS,)) { headers.set(k, v,); }
  for (const [k, v,] of Object.entries(CORS_HEADERS,)) { headers.set(k, v,); }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  },);
}

// MCP 2026-07-28 requires every JSON-RPC result to carry a resultType field
// ("complete" or "input_required") so clients can distinguish finished results
// from those needing more input. The SDK (v1) does not emit it, so inject
// "complete" into any JSON result that lacks it. Handles both application/json
// and text/event-stream (SSE) MCP responses.
interface JsonRpcMessage {
  result?: Record<string, unknown> | null;
}

function injectResultType(payload: unknown,): boolean {
  if (typeof payload !== 'object' || payload === null) { return false; }
  const message = payload as JsonRpcMessage;
  if (typeof message.result !== 'object' || message.result === null) { return false; }
  if (message.result.resultType === undefined) {
    message.result.resultType = 'complete';
    return true;
  }
  return false;
}

// Extract the final JSON-RPC message (the one carrying `result` or `error`)
// from an SSE body. Returns null if no parseable frame is found.
function sseToJson(sseText: string,): Record<string, unknown> | null {
  const frames = sseText.split('\n\n',);
  let last: Record<string, unknown> | null = null;
  for (const frame of frames) {
    if (!frame.trim()) { continue; }
    const dataLines: string[] = [];
    for (const line of frame.split('\n',)) {
      if (line.startsWith('data:',)) { dataLines.push(line.slice(5,).trim(),); }
    }
    if (dataLines.length === 0) { continue; }
    try {
      const payload = JSON.parse(dataLines.join('\n',),) as Record<string, unknown>;
      if (
        payload && typeof payload === 'object'
        && ('result' in payload || 'error' in payload)
      ) {
        last = payload;
      }
    } catch {
      // ignore malformed frame
    }
  }
  return last;
}

async function withResultType(response: Response,): Promise<Response> {
  const contentType = response.headers.get('Content-Type',) ?? '';

  if (contentType.includes('application/json',)) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return response;
    }
    injectResultType(payload,);
    return new Response(JSON.stringify(payload,), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },);
  }

  // The published SDK (v1.x) only emits text/event-stream for Streamable HTTP
  // responses, but a 2026-07-28 server is free to respond with application/json
  // when the client accepts both (which it must). Convert the SSE stream to a
  // single JSON object so all clients — including those that only parse JSON —
  // receive a well-formed result.
  if (contentType.includes('text/event-stream',)) {
    const text = await response.text();
    const json = sseToJson(text,);
    if (json) {
      injectResultType(json,);
      const headers = new Headers(response.headers,);
      headers.set('Content-Type', 'application/json; charset=utf-8',);
      return new Response(JSON.stringify(json,), {
        status: response.status,
        statusText: response.statusText,
        headers,
      },);
    }
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },);
  }

  return response;
}

// MCP 2026-07-28 (Streamable HTTP §Server Validation): values mirrored into HTTP
// headers MUST match the corresponding values in the request body. Servers MUST
// reject any mismatch with HTTP 400 + JSON-RPC error -32020 (HeaderMismatch), so
// a gateway routing on the header cannot be tricked into executing a different
// method than the one it authorized.
interface RpcBody {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

// Mcp-Name and Mcp-Param-* values may be Base64-encoded using the sentinel
// format =?base64?VALUE?= when they cannot be safely represented as ASCII.
// Servers MUST decode before comparing to the body value.
function decodeSentinel(value: string,): string {
  const match = /^\s*=\?base64\?([A-Za-z0-9+/=]+)\?=\s*$/.exec(value,);
  if (!match) { return value; }
  try {
    const binary = atob(match[1],);
    const bytes = new Uint8Array(binary.length,);
    for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i,); }
    return new TextDecoder().decode(bytes,);
  } catch {
    return value;
  }
}

function headerMismatchError(id: unknown, message: string,): Response {
  const payload = { jsonrpc: '2.0', id: id ?? null, error: { code: -32020, message, }, };
  return new Response(JSON.stringify(payload,), {
    status: 400,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'mcp-protocol-version': '2026-07-28',
      'access-control-allow-origin': '*',
    },
  },);
}

const NAME_METHODS = new Set(['tools/call', 'resources/read', 'prompts/get',],);

function validateMcpHeaders(request: Request, body: RpcBody,): Response | null {
  const protoHeader = request.headers.get('mcp-protocol-version',);
  const protoBody = body._meta?.['io.modelcontextprotocol/protocolVersion'];
  if (!protoHeader || protoHeader !== protoBody) {
    return headerMismatchError(
      body.id,
      `Header mismatch: MCP-Protocol-Version header '${
        protoHeader ?? ''
      }' does not match body _meta protocolVersion '${String(protoBody ?? '',)}'`,
    );
  }

  const methodHeader = request.headers.get('mcp-method',);
  if (!methodHeader || methodHeader !== body.method) {
    return headerMismatchError(
      body.id,
      `Header mismatch: Mcp-Method header '${methodHeader ?? ''}' does not match body method '${
        body.method ?? ''
      }'`,
    );
  }

  if (body.method && NAME_METHODS.has(body.method,)) {
    const nameHeader = request.headers.get('mcp-name',);
    const bodyName = body.params?.['name'] ?? body.params?.['uri'];
    const expected = decodeSentinel(nameHeader ?? '',);
    if (!nameHeader || expected !== bodyName) {
      return headerMismatchError(
        body.id,
        `Header mismatch: Mcp-Name header '${nameHeader ?? ''}' does not match body value '${
          String(bodyName ?? '',)
        }'`,
      );
    }
  }

  return null;
}

// Recursively remove `_meta` from a JSON-RPC message (and any nested objects)
// so the 2025-era SDK schema accepts it. `_meta` is per-request routing
// metadata (io.modelcontextprotocol/*) and is not needed to execute a tool.
function stripMeta<T,>(value: T,): T {
  if (Array.isArray(value,)) {
    return value.map((v,) => stripMeta(v,)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v,] of Object.entries(value as Record<string, unknown>,)) {
      if (k === '_meta') { continue; }
      out[k] = stripMeta(v,);
    }
    return out as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env,): Promise<Response> {
    const url = new URL(request.url,);

    // Force HTTPS: reject plain HTTP with a permanent redirect (308 preserves
    // method and body for MCP POST requests). Loopback hosts (local dev) exempt.
    if (url.protocol === 'http:' && !isLoopback(url.hostname,)) {
      url.protocol = 'https:';
      return withHeaders(Response.redirect(url.toString(), 308,),);
    }

    // OPTIONS preflight — respond immediately for all endpoints.
    if (request.method === 'OPTIONS') {
      return withHeaders(new Response(null, { status: 204, },),);
    }

    if (url.pathname === '/') {
      // Landing page sets its own Content-Security-Policy (allows fonts + inline
      // script/style). Apply the remaining security headers so it renders correctly.
      const landing = handleLanding(request,);
      const headers = new Headers(landing.headers,);
      for (const [k, v,] of Object.entries(SECURITY_HEADERS,)) {
        if (k !== 'Content-Security-Policy') { headers.set(k, v,); }
      }
      for (const [k, v,] of Object.entries(CORS_HEADERS,)) { headers.set(k, v,); }
      return new Response(landing.body, { status: landing.status, headers, },);
    }

    if (url.pathname === '/version') {
      return withHeaders(Response.json({ version: VERSION, },),);
    }

    if (url.pathname.startsWith('/.well-known/',)) {
      const response = await handleWellKnown(request,);
      return withHeaders(response ?? new Response('Not Found', { status: 404, },),);
    }

    if (url.pathname !== '/mcp') {
      return withHeaders(new Response('Not Found', { status: 404, },),);
    }

    // server/discover (MCP 2026-07-28) is a public capability pre-fetch endpoint,
    // analogous to the unauthenticated /.well-known/ discovery documents. It only
    // returns server metadata (name, version, capabilities, protocol version), so
    // it is served WITHOUT auth. Real tool calls below remain fail-closed.
    if (request.method === 'POST') {
      const contentType = request.headers.get('Content-Type',);
      if (contentType?.includes('application/json',)) {
        try {
          // Clone before reading: consuming the original request body here would
          // leave the transport with an empty stream for real tool calls.
          const body = (await request.clone().json()) as { method?: string; id?: string | number; };
          if (body.method === 'server/discover') {
            const discoverResponse = {
              jsonrpc: '2.0',
              id: body.id,
              result: {
                resultType: 'complete',
                supportedVersions: ['2026-07-28',],
                capabilities: {
                  tools: {},
                },
                _meta: {
                  'io.modelcontextprotocol/serverInfo': {
                    name: 'azkena',
                    version: VERSION,
                  },
                },
                instructions:
                  'Azkena exposes Basque pelota competition data for the Pilotariak platform '
                  + 'via read-only tools (competitions, clubs, categories, specialties, results). '
                  + 'Always pass a league parameter: lcapb, lidfpb, ccapb, or ctpb.',
                ttlMs: 3600000,
                cacheScope: 'public',
              },
            };
            return withHeaders(Response.json(discoverResponse,),);
          }

          // MCP 2026-07-28 retires the initialize/initialized handshake (SEP-2575,
          // SEP-2567). Reject it so scanners/clients do not classify azkena as a
          // 2025-era server from the SDK's legacy protocolVersion, and so the
          // stateless core (server/discover + per-request self-describing calls)
          // is the only path. Capability pre-fetch happens via server/discover.
          if (body.method === 'initialize' || body.method === 'initialized') {
            const rejectResponse = {
              jsonrpc: '2.0',
              id: body.id,
              error: {
                code: -32601,
                message: 'Method not found: initialize/initialized are retired in MCP 2026-07-28. '
                  + 'Use server/discover for capability pre-fetch.',
              },
            };
            return withHeaders(Response.json(rejectResponse,),);
          }
        } catch {
          // If JSON parsing fails, continue with normal (authenticated) MCP handling
        }
      }
    }

    // Fail-closed auth: only loopback hosts (local dev) may connect without a
    // token. Any deployed worker must have MCP_API_TOKEN configured, otherwise
    // it refuses to serve the MCP endpoint. Do NOT gate this on ENVIRONMENT —
    // the default vars ship ENVIRONMENT=development, which would accidentally
    // leave a `wrangler deploy` (without --env) wide open.
    if (!env.MCP_API_TOKEN && !isLoopback(url.hostname,)) {
      return withHeaders(new Response('Unauthorized', { status: 401, },),);
    }

    if (env.MCP_API_TOKEN) {
      const authHeader = request.headers.get('Authorization',);
      if (!authHeader || !authHeader.startsWith('Bearer ',)) {
        console.warn('Missing or malformed Authorization header',);
        return withHeaders(new Response('Unauthorized', { status: 401, },),);
      }

      const token = authHeader.split(' ',)[1];

      // Use subtle crypto for constant-time comparison to prevent timing attacks
      const encoder = new TextEncoder();
      const expectedToken = encoder.encode(env.MCP_API_TOKEN,);
      const actualToken = encoder.encode(token,);

      if (expectedToken.length !== actualToken.length) {
        console.warn('Invalid token',);
        return withHeaders(new Response('Unauthorized', { status: 401, },),);
      }

      let isEqual = true;
      for (let i = 0; i < expectedToken.length; i++) {
        if (expectedToken[i] !== actualToken[i]) {
          isEqual = false;
        }
      }

      if (!isEqual) {
        console.warn('Invalid token',);
        return withHeaders(new Response('Unauthorized', { status: 401, },),);
      }
    }

    // Read the body from a clone for header/body validation; the transport
    // receives the original request so its body stream stays intact.
    const rawBody = await request.clone().text();
    let rpcBody: RpcBody | null = null;
    try {
      const parsed = JSON.parse(rawBody,);
      if (parsed && typeof parsed === 'object') { rpcBody = parsed as RpcBody; }
    } catch {
      rpcBody = null;
    }

    // Only JSON-RPC requests (objects carrying a `method`) are subject to header
    // validation. Malformed or non-JSON bodies are passed through to the
    // transport, which returns its own error.
    if (rpcBody && rpcBody.method) {
      const headerError = validateMcpHeaders(request, rpcBody,);
      if (headerError) { return withHeaders(headerError,); }
    }

    const server = new McpServer({ name: 'azkena', version: VERSION, },);
    registerTools(server, env,);

    // Stateless mode: sessionIdGenerator undefined means no persistent session.
    // Each request creates a fresh server — correct for Cloudflare Workers.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    },);
    await server.connect(transport,);

    // The published SDK (v1.x) targets the 2025 protocol. It rejects two things
    // that are mandatory in 2026-07-28: the `MCP-Protocol-Version: 2026-07-28`
    // header (only 2025-era versions are "supported"), and the top-level `_meta`
    // envelope (its strict JSON-RPC schema only allows `_meta` inside `params`).
    // We have already validated the real header/_meta above; here we present the
    // SDK with a shape it accepts: a supported protocol-version header and the
    // `_meta` envelope stripped. Tool execution is identical across these
    // versions, so the SDK dispatches correctly and we re-add the 2026-07-28
    // framing (resultType, protocol-version header) on the way out.
    const sdkBody = rpcBody ? stripMeta(rpcBody,) : rpcBody;
    const sdkHeaders = new Headers(request.headers,);
    sdkHeaders.set('mcp-protocol-version', SUPPORTED_SDK_VERSION,);
    const sdkRequest = new Request(request.url, {
      method: 'POST',
      headers: sdkHeaders,
      body: JSON.stringify(sdkBody ?? {},),
    },);
    const response = await transport.handleRequest(
      sdkRequest,
      sdkBody ? { parsedBody: sdkBody, } as Record<string, unknown> : undefined,
    );

    // MCP 2026-07-28: every result carries resultType ("complete" / "input_required").
    const typed = await withResultType(response,);

    // MCP 2026-07-28 header-based routing (SEP-2243): echo Mcp-Method / Mcp-Name
    // so gateways/WAFs can route and meter on headers.
    const outHeaders = new Headers(typed.headers,);
    const mcpMethod = request.headers.get('Mcp-Method',);
    const mcpName = request.headers.get('Mcp-Name',);
    if (mcpMethod) { outHeaders.set('Mcp-Method', mcpMethod,); }
    if (mcpName) { outHeaders.set('Mcp-Name', mcpName,); }

    const out = new Response(typed.body, {
      status: typed.status,
      statusText: typed.statusText,
      headers: outHeaders,
    },);
    return withHeaders(out,);
  },
};
