# azkena

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/Pilotariak/azkena/blob/main/LICENSE)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Pilotariak/azkena/badge)](https://scorecard.dev/viewer/?uri=github.com/Pilotariak/azkena)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/xxxxxx/badge)](https://bestpractices.coreinfrastructure.org/projects/xxxxxxx)

**Azkena** is the [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the
[Pilotariak](https://github.com/Pilotariak) platform. It exposes Basque pelota competition data
as MCP tools so AI assistants (Claude Desktop, Cursor, Copilot Workspace, etc.) can query
competitions, clubs, results, and more through natural language.

Built as a Cloudflare Worker using `@modelcontextprotocol/sdk`.

## MCP Tools

| Tool                | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| `list_competitions` | All competitions for a league                                        |
| `list_clubs`        | All clubs in a league                                                |
| `list_categories`   | Player categories (divisions/series)                                 |
| `list_specialties`  | Basque pelota disciplines (trinquet, chistera, …)                    |
| `list_results`      | Match results with filters (competition, specialty, category, phase) |

All tools accept a `league` parameter: `lcapb` · `lidfpb` · `ccapb` · `ctpb`

## Protocol

Azkena speaks the [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
stateless core:

- No `initialize`/`initialized` handshake — every request is self-describing
- `server/discover` for capability pre-fetching
- `MCP-Protocol-Version: 2026-07-28` response header
- `Mcp-Method` / `Mcp-Name` header-based routing (SEP-2243)
- `ttlMs` / `cacheScope` cache hints on list-type tool responses (SEP-2549)

## Quick Start

```bash
npm install
make dev       # → http://localhost:8787
```

See [AGENTS.md](AGENTS.md) for full developer documentation, Claude Desktop integration, and deployment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
See [CONTRIBUTING](CONTRIBUTING.md)

## License

See [LICENSE](LICENSE)
