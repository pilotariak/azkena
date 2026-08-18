/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { handleWellKnown } from './discovery.js';
import type { Env } from './types.js';
import { registerTools } from './tools/index.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return Response.json({ name: 'azkena', version: '0.1.0', status: 'ok' });
    }

    if (url.pathname.startsWith('/.well-known/')) {
      const response = await handleWellKnown(request);
      return response ?? new Response('Not Found', { status: 404 });
    }

    if (url.pathname !== '/mcp') {
      return new Response('Not Found', { status: 404 });
    }

    if (env.MCP_API_TOKEN) {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${env.MCP_API_TOKEN}`) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const server = new McpServer({
      name: 'azkena',
      version: '0.1.0',
    });

    registerTools(server, env);

    // Stateless mode: sessionIdGenerator undefined means no persistent session.
    // Each request creates a fresh server — correct for Cloudflare Workers.
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
