/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Env {
  /** GraphQL endpoint for the Frontis gateway. */
  FRONTIS_URL: string;
  /** Optional Bearer token required on incoming MCP requests. */
  MCP_API_TOKEN?: string;
  /** KV namespace storing OAuth clients, grants, and tokens. Required for the
   *  OAuth 2.0 authorization server (`/oauth/*` endpoints). */
  OAUTH_KV?: KVNamespace;
  /** Runtime OAuth helpers injected by `@cloudflare/workers-oauth-provider`. */
  OAUTH_PROVIDER?: import('@cloudflare/workers-oauth-provider').OAuthHelpers;
  /** Cloudflare Rate Limiting binding (60 req/60s per client IP). Optional so
   *  environments/tests without the binding degrade to "no rate limiting"
   *  rather than crashing. */
  RATE_LIMITER?: RateLimit;
  /** 'development' | 'staging' | 'production' */
  ENVIRONMENT?: string;
  /** Pino log level: 'trace' | 'debug' | 'info' | 'warn' | 'error' (default: 'info') */
  LOG_LEVEL?: string;
}
