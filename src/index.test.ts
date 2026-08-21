/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, } from 'vitest';
import worker from './index.js';
import type { Env, } from './types.js';

const env: Env = {
  FRONTIS_URL: 'https://frontis-gateway.pilotariak.com/graphql',
  ENVIRONMENT: 'production',
  MCP_API_TOKEN: 'secret-token',
  LOG_LEVEL: 'info',
};

describe('security headers', () => {
  it('redirects plain HTTP to HTTPS with 308', async () => {
    const res = await worker.fetch(
      new Request('http://mcp.pilotariak.com/mcp', { method: 'POST', },),
      env,
    );
    expect(res.status,).toBe(308,);
    expect(res.headers.get('location',),).toBe('https://mcp.pilotariak.com/mcp',);
  });

  it('does not redirect loopback hosts (local dev)', async () => {
    const res = await worker.fetch(
      new Request('http://localhost:8787/mcp', { method: 'POST', },),
      env,
    );
    expect(res.status,).toBe(401,);
  });

  it('rejects unauthenticated requests when token is configured', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', { method: 'POST', },),
      env,
    );
    expect(res.status,).toBe(401,);
  });

  it('rejects requests when token is missing on non-loopback hosts, regardless of ENVIRONMENT', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', { method: 'POST', },),
      { ...env, ENVIRONMENT: 'development', MCP_API_TOKEN: undefined, },
    );
    expect(res.status,).toBe(401,);
  });

  it('allows unauthenticated requests from loopback hosts (local dev)', async () => {
    const res = await worker.fetch(
      new Request('http://localhost:8787/mcp', { method: 'POST', },),
      { ...env, ENVIRONMENT: 'development', MCP_API_TOKEN: undefined, },
    );
    expect(res.status,).not.toBe(401,);
  });

  it('serves landing page with CSP when CSP is allowed', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/',),
      { ...env, MCP_API_TOKEN: undefined, },
    );
    expect(res.status,).toBe(200,);
    expect(res.headers.get('content-security-policy',),).toContain('default-src \'none\'',);
  });

  it('emits MCP-Protocol-Version header on MCP responses', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-token', },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
        },),
      },),
      env,
    );
    expect(res.status,).toBe(200,);
    expect(res.headers.get('MCP-Protocol-Version',),).toBe('2026-07-28',);
  });

  it('answers server/discover with 2026-07-28 protocol version', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer secret-token', },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
        },),
      },),
      env,
    );
    const payload = (await res.json()) as { result: { _meta: { protocolVersion: string; }; }; };
    expect(payload.result._meta.protocolVersion,).toBe('2026-07-28',);
  });

  it('serves server/discover without auth (public capability pre-fetch)', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
        },),
      },),
      env,
    );
    expect(res.status,).toBe(200,);
    const payload = (await res.json()) as { result: { _meta: { protocolVersion: string; }; }; };
    expect(payload.result._meta.protocolVersion,).toBe('2026-07-28',);
  });

  it('allows Mcp-Method and Mcp-Name headers via CORS', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', { method: 'OPTIONS', },),
      env,
    );
    expect(res.headers.get('access-control-allow-headers',),).toContain('Mcp-Method',);
    expect(res.headers.get('access-control-allow-headers',),).toContain('Mcp-Name',);
    expect(res.headers.get('access-control-allow-headers',),).not.toContain('Mcp-Session-Id',);
  });
});
