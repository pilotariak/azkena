/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AuthRequest, ClientInfo, OAuthHelpers, } from '@cloudflare/workers-oauth-provider';
import type { Env, } from '../types.js';

// ---------------------------------------------------------------------------
// OAuth 2.0 authorization endpoint (`/oauth/authorize`)
//
// The `@cloudflare/workers-oauth-provider` library implements the token,
// client-registration, and metadata endpoints itself, but delegates the
// authorization endpoint to the configured `defaultHandler`. This handler
// renders a consent page and completes the grant.
//
// Azkena exposes only public, read-only data, so the consent screen grants
// access to a fixed public principal — there is no user account to log in to.
// ---------------------------------------------------------------------------

// `parseAuthRequest` reads parameters from the request URL query string, so the
// consent form submits as GET and preserves every original parameter.
const CONSENT_CSP =
  'default-src \'none\'; style-src \'unsafe-inline\'; form-action \'self\'; base-uri \'none\'; frame-ancestors \'none\'';

// Fixed principal bound to every grant. Azkena data is public, so no per-user
// identity is needed for authorization.
const PUBLIC_USER_ID = 'azkena-public';

interface AuthorizeEnv extends Env {
  OAUTH_PROVIDER?: OAuthHelpers;
}

function escapeHtml(value: string,): string {
  return value
    .replace(/&/g, '&amp;',)
    .replace(/</g, '&lt;',)
    .replace(/>/g, '&gt;',)
    .replace(/"/g, '&quot;',)
    .replace(/'/g, '&#39;',);
}

function renderConsentPage(
  request: Request,
  authRequest: AuthRequest,
  clientName: string,
): Response {
  const url = new URL(request.url,);
  const hidden = [...url.searchParams.entries(),]
    .map(([k, v,],) => `<input type="hidden" name="${escapeHtml(k,)}" value="${escapeHtml(v,)}">`)
    .join('\n',);
  const scopes = authRequest.scope?.join(', ',) || 'read access to public competition data';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorize azkena</title>
<style>
  body { font-family: system-ui, sans-serif; background:#0f1115; color:#e8e8ea;
         display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
  .card { background:#1a1d24; padding:2rem; border-radius:12px; max-width:420px; width:90%; }
  h1 { font-size:1.25rem; margin-top:0; }
  p { line-height:1.5; color:#a8a8b0; }
  .scopes { background:#0f1115; padding:.75rem 1rem; border-radius:8px; font-size:.9rem; }
  button { width:100%; padding:.75rem; border:0; border-radius:8px; font-size:1rem;
           cursor:pointer; margin-top:1rem; }
  .allow { background:#3b82f6; color:#fff; }
  .deny { background:transparent; color:#a8a8b0; border:1px solid #333; }
</style>
</head>
<body>
  <div class="card">
    <h1>Authorize ${escapeHtml(clientName,)}</h1>
    <p><strong>${escapeHtml(clientName,)}</strong> wants to access azkena, the Pilotariak
       Basque pelota competition data server.</p>
    <div class="scopes">Requested access: ${escapeHtml(scopes,)}</div>
    <form method="get" action="/oauth/authorize">
      ${hidden}
      <button class="allow" name="submit" value="allow" type="submit">Allow access</button>
    </form>
    <form method="get" action="/oauth/authorize">
      ${hidden}
      <button class="deny" name="submit" value="deny" type="submit">Cancel</button>
    </form>
  </div>
</body>
</html>`;
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': CONSENT_CSP,
      'x-content-type-options': 'nosniff',
    },
  },);
}

function errorResponse(message: string,): Response {
  return new Response(message, {
    status: 400,
    headers: { 'content-type': 'text/plain; charset=utf-8', },
  },);
}

export async function handleAuthorize(request: Request, env: AuthorizeEnv,): Promise<Response> {
  const url = new URL(request.url,);
  if (url.pathname !== '/oauth/authorize') {
    return new Response('Not Found', { status: 404, },);
  }

  if (!env.OAUTH_PROVIDER) {
    return errorResponse('OAuth is not configured (OAUTH_KV missing).',);
  }

  let authRequest: AuthRequest;
  try {
    authRequest = await env.OAUTH_PROVIDER.parseAuthRequest(request,);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid authorization request';
    return errorResponse(`Authorization error: ${message}`,);
  }

  let client: ClientInfo | null = null;
  try {
    client = await env.OAUTH_PROVIDER.lookupClient(authRequest.clientId,);
  } catch {
    client = null;
  }
  const clientName = client?.clientName ?? authRequest.clientId;

  const submit = url.searchParams.get('submit',);

  if (submit === 'deny') {
    const params = new URLSearchParams({ error: 'access_denied', },);
    if (authRequest.state) { params.set('state', authRequest.state,); }
    const sep = authRequest.redirectUri.includes('?',) ? '&' : '?';
    return Response.redirect(`${authRequest.redirectUri}${sep}${params.toString()}`, 302,);
  }

  if (submit !== 'allow') {
    return renderConsentPage(request, authRequest, clientName,);
  }

  const { redirectTo, } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: authRequest,
    userId: PUBLIC_USER_ID,
    metadata: { clientName, },
    scope: authRequest.scope ?? [],
    props: {},
  },);

  return Response.redirect(redirectTo, 302,);
}
