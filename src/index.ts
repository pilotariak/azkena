/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { handleWellKnown } from './discovery.js';
import { registerTools } from './tools/index.js';
import type { Env } from './types.js';
import { VERSION } from './version.js';

// ---------------------------------------------------------------------------
// Security & CORS helpers
// ---------------------------------------------------------------------------

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// CORS is open: all azkena data is public, no ambient credentials.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
};

function withHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // OPTIONS preflight — respond immediately for all endpoints.
    if (request.method === 'OPTIONS') {
      return withHeaders(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/') {
      return withHeaders(Response.json({ name: 'azkena', version: VERSION, status: 'ok' }));
    }

    if (url.pathname.startsWith('/.well-known/')) {
      const response = await handleWellKnown(request);
      return withHeaders(response ?? new Response('Not Found', { status: 404 }));
    }

    if (url.pathname !== '/mcp') {
      return withHeaders(new Response('Not Found', { status: 404 }));
    }

    if (env.MCP_API_TOKEN) {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${env.MCP_API_TOKEN}`) {
        return withHeaders(new Response('Unauthorized', { status: 401 }));
      }
    }

    const server = new McpServer({ name: 'azkena', version: VERSION });
    registerTools(server, env);

    // Stateless mode: sessionIdGenerator undefined means no persistent session.
    // Each request creates a fresh server — correct for Cloudflare Workers.
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withHeaders(response);
  },
};
