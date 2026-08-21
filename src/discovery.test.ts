/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { handleWellKnown } from './discovery.js';

describe('RFC 8414 OAuth discovery endpoints', () => {
  const host = 'https://mcp.pilotariak.com';

  it('serves OAuth Authorization Server Metadata', async () => {
    const res = await handleWellKnown(new Request(`${host}/.well-known/oauth-authorization-server`));
    expect(res?.status).toBe(200);
    expect(res?.headers.get('content-type')).toContain('application/json');
    expect(res?.headers.get('cache-control')).toContain('public');

    const body = (await res?.json()) as {
      issuer: string;
      authorization_endpoint: string;
      token_endpoint: string;
      service_documentation: string;
      op_policy_uri: string;
      op_tos_uri: string;
      ui_locales_supported: string[];
      scopes_supported: string[];
      response_types_supported: string[];
      grant_types_supported: string[];
      token_endpoint_auth_methods_supported: string[];
      code_challenge_methods_supported: string[];
      authorization_response_iss_parameter_supported: boolean;
      protected_resources: string[];
    };
    expect(body.issuer).toBe(host);
    expect(body.authorization_endpoint).toBe(`${host}/oauth/authorize`);
    expect(body.token_endpoint).toBe(`${host}/oauth/token`);
    expect(body.service_documentation).toBe(
      'https://github.com/pilotariak/azkena/blob/main/AGENTS.md',
    );
    expect(body.op_policy_uri).toBe(
      'https://github.com/pilotariak/azkena/blob/main/SECURITY.md',
    );
    expect(body.op_tos_uri).toBe('https://github.com/pilotariak/azkena');
    expect(body.ui_locales_supported).toEqual(['fr', 'en', 'eu']);
    expect(body.scopes_supported).toEqual(['read:competitions', 'read:clubs', 'read:results']);
    expect(body.response_types_supported).toEqual(['code']);
    expect(body.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(body.token_endpoint_auth_methods_supported).toEqual(['client_secret_basic', 'none']);
    expect(body.code_challenge_methods_supported).toEqual(['S256']);
    expect(body.authorization_response_iss_parameter_supported).toBe(true);
    expect(body.protected_resources).toEqual([`${host}/mcp`]);
  });

  it('serves OAuth Protected Resource Metadata', async () => {
    const res = await handleWellKnown(new Request(`${host}/.well-known/oauth-protected-resource`));
    expect(res?.status).toBe(200);
    expect(res?.headers.get('content-type')).toContain('application/json');
    expect(res?.headers.get('cache-control')).toContain('public');

    const body = (await res?.json()) as {
      resource: string;
      authorization_servers: string[];
      bearer_methods_supported: string[];
    };
    expect(body.resource).toBe(`${host}/mcp`);
    expect(body.authorization_servers).toEqual([host]);
    expect(body.bearer_methods_supported).toEqual(['header']);
  });
});

describe('well-known routing via worker', () => {
  it('does not treat OAuth discovery paths as unknown routes', async () => {
    for (const path of [
      '/.well-known/oauth-authorization-server',
      '/.well-known/oauth-protected-resource',
    ]) {
      const res = await handleWellKnown(new Request(`https://localhost:8787${path}`));
      expect(res?.status).not.toBe(404);
      expect(res).not.toBeNull();
    }
  });
});