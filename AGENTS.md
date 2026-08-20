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

| Tool | Description | Key parameters |
|---|---|---|
| `list_competitions` | All competitions for a league | `league` |
| `list_clubs` | All clubs in a league | `league` |
| `list_categories` | Player categories (divisions/series) | `league` |
| `list_specialties` | Basque pelota disciplines | `league` |
| `list_results` | Match results with optional filters | `league`, `competitionId?`, `specialtyId?`, `categoryId?`, `phase?` |

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

`MCP_API_TOKEN` is optional — if unset, the server accepts all requests (development only).

## Running Locally

```bash
make dev             # bunx wrangler dev  →  http://localhost:8787
```

Test with curl:

```bash
# Health check
curl http://localhost:8787/

# MCP initialize
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}'
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

| Env | Worker name | URL | Notes |
|---|---|---|---|
| `development` (default) | `azkena` (local) | `http://localhost:8787` | `wrangler dev`, no auth required |
| `staging` | `azkena-staging` | `https://azkena-staging.pilotariak.workers.dev` | `wrangler deploy --env staging` |
| `production` | `azkena` | `https://mcp.pilotariak.com` | `wrangler deploy --env production` |

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

| Path | Standard | Content-Type |
|---|---|---|
| `/.well-known/api-catalog` | IETF draft-ietf-httpapi-api-catalog | `application/linkset+json` |
| `/.well-known/ai-catalog.json` | AI Catalog ARD v1.0 | `application/json` |
| `/.well-known/mcp/server-card.json` | MCP Server Card 2025-10 | `application/json` |
| `/.well-known/agent-skills/index.json` | Agent Skills schema 0.2.0 | `application/json` |
| `/.well-known/agent-skills/<name>/SKILL.md` | Skill detail document | `text/markdown` |

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

Azkena uses a Bearer token mechanism for authentication.

- **Current Mechanism:** The worker checks for an `Authorization` header containing a Bearer token that must match the `MCP_API_TOKEN` environment variable. If `MCP_API_TOKEN` is not set, no authentication is required (for local development only).
- **Robustness/Future Path:** To implement more robust authorization (e.g., OAuth 2.1), we recommend adopting the `workers-oauth-provider` library. This allows for integration with identity providers or handling the full OAuth flow within the Worker. For detailed documentation and implementation examples, see the [Cloudflare Authorization documentation](https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/).

## Key Conventions

- Transport: `StreamableHTTPServerTransport` in **stateless mode** (`sessionIdGenerator: undefined`)
  — a fresh `McpServer` is created per request, matching Cloudflare Workers' stateless model
- All tools call **Frontis** (GraphQL gateway) via `X-Pilotariak-League` header for league routing
- Formatting: `dprint` (config in `dprint.json`)
- License headers required on all source files (checked by `licenserc.toml`)

## Adding a Tool

1. Create `src/tools/<name>.ts` with a `register<Name>Tools(server, env)` function
2. Import and call it in `src/tools/index.ts`
