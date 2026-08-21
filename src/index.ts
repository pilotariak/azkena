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
          const body = (await request.json()) as { method?: string; id?: string | number; };
          if (body.method === 'server/discover') {
            const discoverResponse = {
              jsonrpc: '2.0',
              id: body.id,
              result: {
                name: 'azkena',
                version: VERSION,
                capabilities: {
                  tools: {},
                  prompts: {},
                  resources: {},
                },
                _meta: {
                  protocolVersion: '2026-07-28',
                },
              },
            };
            return withHeaders(Response.json(discoverResponse,),);
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

    const server = new McpServer({ name: 'azkena', version: VERSION, },);
    registerTools(server, env,);

    // Stateless mode: sessionIdGenerator undefined means no persistent session.
    // Each request creates a fresh server — correct for Cloudflare Workers.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    },);
    await server.connect(transport,);
    const response = await transport.handleRequest(request,);

    // MCP 2026-07-28 header-based routing (SEP-2243): echo Mcp-Method / Mcp-Name
    // so gateways/WAFs can route and meter on headers.
    const outHeaders = new Headers(response.headers,);
    const mcpMethod = request.headers.get('Mcp-Method',);
    const mcpName = request.headers.get('Mcp-Name',);
    if (mcpMethod) { outHeaders.set('Mcp-Method', mcpMethod,); }
    if (mcpName) { outHeaders.set('Mcp-Name', mcpName,); }

    const out = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    },);
    return withHeaders(out,);
  },
};
