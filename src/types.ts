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
  /** 'development' | 'staging' | 'production' */
  ENVIRONMENT?: string;
  /** Pino log level: 'trace' | 'debug' | 'info' | 'warn' | 'error' (default: 'info') */
  LOG_LEVEL?: string;
}
