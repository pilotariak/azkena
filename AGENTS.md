# AGENTS.md — Azkena

**Azkena** is the Model Context Protocol (MCP) server for the Pilotariak platform.
It exposes Basque pelota competition data as MCP tools so AI assistants (Claude Desktop,
Cursor, Copilot Workspace, etc.) can query competitions, clubs, results, and more.

Built as a Cloudflare Worker using `@modelcontextprotocol/sdk`.

## Architecture

```
azkena/
└── src/
    ├── index.ts          # Worker entry — routes HTTP to MCP and /.well-known/
    ├── types.ts          # Env bindings
    ├── discovery.ts      # /.well-known/ discovery endpoints
    ├── frontis/
    │   └── client.ts     # GraphQL client for Frontis gateway
    └── tools/
        ├── index.ts      # Registers all tools on the McpServer
        ├── competitions.ts
        ├── clubs.ts
        ├── categories.ts
        ├── specialties.ts
        └── results.ts
```

## MCP Tools

| Tool                | Description                          | Key parameters                                                      |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `list_competitions` | All competitions for a league        | `league`                                                            |
| `list_clubs`        | All clubs in a league                | `league`                                                            |
| `list_categories`   | Player categories (divisions/series) | `league`                                                            |
| `list_specialties`  | Basque pelota disciplines            | `league`                                                            |
| `list_results`      | Match results with optional filters  | `league`, `competitionId?`, `specialtyId?`, `categoryId?`, `phase?` |

League codes: `lcapb` · `lidfpb` · `ccapb` · `ctpb`

The typical workflow for an AI assistant:

1. Call `list_competitions` / `list_categories` / `list_specialties` to get IDs
2. Call `list_results` with those IDs to get filtered match results

## Dev Setup

Requirements: [Bun](https://bun.sh) ≥ 1.1, [Wrangler](https://developers.cloudflare.com/workers/wrangler/) ≥ 4

```bash
npm install          # install dependencies (uses npm, not bun)
```

Create `.dev.vars` (git-ignored) for local secrets:

```
MCP_API_TOKEN=<any string for local testing>
```

`MCP_API_TOKEN` is optional — if unset, the server only accepts requests from loopback hosts
(`localhost`, `127.0.0.1`, `::1`) for local development. Any deployed worker must have it set,
otherwise `/mcp` refuses all requests with `401` (fail-closed). Do not gate this on `ENVIRONMENT`.

## Running Locally

```bash
make dev             # bunx wrangler dev  →  http://localhost:8787
```

Test with curl:

```bash
# Health check
curl http://localhost:8787/

# MCP server/discover (capability pre-fetch, MCP 2026-07-28)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"server/discover"}'

# MCP tools/list (stateless core — no initialize handshake)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Method: tools/list" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

## Connecting to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "azkena": {
      "url": "https://mcp.pilotariak.com/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer <MCP_API_TOKEN>"
      }
    }
  }
}
```

For local dev, use `http://localhost:8787/mcp`.

## Testing

```bash
make test            # vitest
```

## Environments

| Env                     | Worker name      | URL                                             | Notes                              |
| ----------------------- | ---------------- | ----------------------------------------------- | ---------------------------------- |
| `development` (default) | `azkena` (local) | `http://localhost:8787`                         | `wrangler dev`, no auth required   |
| `staging`               | `azkena-staging` | `https://azkena-staging.pilotariak.workers.dev` | `wrangler deploy --env staging`    |
| `production`            | `azkena`         | `https://mcp.pilotariak.com`                    | `wrangler deploy --env production` |

Key vars (set per env in `wrangler.jsonc`):

- `FRONTIS_URL` — GraphQL endpoint (default: `https://frontis-gateway.pilotariak.com/graphql`)
- `LOG_LEVEL` — Pino log level

## Production Secrets

```bash
bunx wrangler secret put MCP_API_TOKEN
```

## Deployment

```bash
make deploy          # bunx wrangler deploy (production)
make logs            # tail live worker logs
```

## Discovery Endpoints

All `/.well-known/` endpoints are read-only, unauthenticated, and cacheable (`Cache-Control: public, max-age=3600`).

| Path                                        | Standard                                           | Content-Type               |
| ------------------------------------------- | -------------------------------------------------- | -------------------------- |
| `/.well-known/api-catalog`                  | IETF draft-ietf-httpapi-api-catalog                | `application/linkset+json` |
| `/.well-known/ai-catalog.json`              | AI Catalog ARD v1.0                                | `application/json`         |
| `/.well-known/mcp/server-card.json`         | MCP Server Card 2025-10                            | `application/json`         |
| `/.well-known/agent-skills/index.json`      | Agent Skills schema 0.2.0                          | `application/json`         |
| `/.well-known/agent-skills/<name>/SKILL.md` | Skill detail document                              | `text/markdown`            |
| `/.well-known/oauth-authorization-server`   | OAuth 2.0 Authorization Server Metadata (RFC 8414) | `application/json`         |
| `/.well-known/oauth-protected-resource`     | OAuth 2.0 Protected Resource Metadata (RFC 8414)   | `application/json`         |

These follow the patterns established at [turva.dev](https://turva.dev/.well-known/api-catalog).

All URLs in the discovery documents are derived from the incoming request host, so they work
identically in local dev (`localhost:8787`) and in production.

### Agent Skills

Two skills are published:

- **`query-competitions`** — query competition listings for a league
- **`query-results`** — query match results with optional filters (competition, specialty, category, phase)

The SHA-256 digest in the skills index is computed at request time via `crypto.subtle.digest`,
so it always reflects the actual content served.

## Authentication and Security

Azkena supports:
- Bearer token mechanism for authentication.
- Client ID Metadata Documents (CIMD) for client registration.

- **Current Mechanism:** The worker accepts one of three credentials on the MCP endpoint:
  1. A valid OAuth 2.0 access token issued by the built-in authorization server
     (`/oauth/authorize`, `/oauth/token`, `/oauth/client/register`), backed by the
     `OAUTH_KV` KV binding. This is the path MCP clients such as Codex use.
  2. A Bearer token matching `MCP_API_TOKEN` (simple shared-secret auth).
  3. No token when the request originates from a loopback host (local development only).
  If `MCP_API_TOKEN` is not set and the request is not loopback and not carrying a valid
  OAuth token, the worker refuses with `401` (fail-closed).
- **OAuth 2.0 authorization server:** Implemented with `@cloudflare/workers-oauth-provider`.
  The `/oauth/*` routes are delegated to `OAuthProvider`; the `/mcp` route additionally
  accepts OAuth-issued access tokens via `getOAuthApi(...).unwrapToken`. The provider stores
  clients, grants, and tokens in the `OAUTH_KV` namespace and requires the
  `global_fetch_strictly_public` compatibility flag (so it can fetch CIMD documents).
- **Client Registration:** Dynamic Client Registration (RFC 7591) and Client ID Metadata
  Documents (CIMD, `clientIdMetadataDocumentEnabled: true`) are both supported, so clients
  may register by URL (`https://…/client/metadata`) or by POSTing metadata to
  `/oauth/client/register`.
- **Setup:** Create the KV namespace and wire it up (see the commented `kv_namespaces` block
  in `wrangler.jsonc`):
  ```bash
  bunx wrangler kv namespace create OAUTH_KV
  bunx wrangler kv namespace create OAUTH_KV --preview
  ```

## Key Conventions

- Transport: `WebStandardStreamableHTTPServerTransport` in **stateless mode** (`sessionIdGenerator: undefined`)
  — a fresh `McpServer` is created per request, matching Cloudflare Workers' stateless model
- Protocol: MCP **2026-07-28** stateless core — the `initialize`/`initialized` handshake and
  `Mcp-Session-Id` header are retired. Each request is self-describing; `server/discover` may be
  used for capability pre-fetching. Every response carries `MCP-Protocol-Version: 2026-07-28`.
- Streamable HTTP requests accept/echo `Mcp-Method` / `Mcp-Name` headers (SEP-2243) so gateways
  and WAFs can route and meter on headers.
- List-type tool responses carry `ttlMs` / `cacheScope` cache hints (SEP-2549).
- All tools call **Frontis** (GraphQL gateway) via `X-Pilotariak-League` header for league routing
- Formatting: `dprint` (config in `dprint.json`)
- License headers required on all source files (checked by `licenserc.toml`)

## Adding a Tool

1. Create `src/tools/<name>.ts` with a `register<Name>Tools(server, env)` function
2. Import and call it in `src/tools/index.ts`
