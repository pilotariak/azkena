/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import worker from './index.js';
import type { Env } from './types.js';

const env: Env = {
  FRONTIS_URL: 'https://frontis-gateway.pilotariak.com/graphql',
  ENVIRONMENT: 'production',
  MCP_API_TOKEN: 'secret-token',
  LOG_LEVEL: 'info',
};

describe('security headers', () => {
  it('redirects plain HTTP to HTTPS with 308', async () => {
    const res = await worker.fetch(
      new Request('http://mcp.pilotariak.com/mcp', { method: 'POST' }),
      env,
    );
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://mcp.pilotariak.com/mcp');
  });

  it('does not redirect loopback hosts (local dev)', async () => {
    const res = await worker.fetch(
      new Request('http://localhost:8787/mcp', { method: 'POST' }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated requests when token is configured', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', { method: 'POST' }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it('rejects requests when token is missing outside development', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/mcp', { method: 'POST' }),
      { ...env, MCP_API_TOKEN: undefined },
    );
    expect(res.status).toBe(401);
  });

  it('serves landing page with CSP when CSP is allowed', async () => {
    const res = await worker.fetch(
      new Request('https://mcp.pilotariak.com/'),
      { ...env, MCP_API_TOKEN: undefined },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
  });
});
