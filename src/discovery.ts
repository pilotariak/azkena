/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

// Tool descriptions — keep in sync with src/tools/*.ts
const TOOL_CATALOG = [
  {
    name: 'list_competitions',
    description: 'List all competitions for a Basque pelota league. Returns competition IDs and names.',
  },
  {
    name: 'list_clubs',
    description: 'List all clubs registered in a Basque pelota league. Returns club IDs and names.',
  },
  {
    name: 'list_categories',
    description:
      'List player categories (divisions/series) for a league. Use returned IDs when filtering results.',
  },
  {
    name: 'list_specialties',
    description:
      'List Basque pelota disciplines (trinquet, chistera, place libre, etc.) for a league. Use returned IDs when filtering results.',
  },
  {
    name: 'list_results',
    description:
      'List match results for a league, optionally filtered by competition, specialty, category, or phase.',
  },
];

const SKILL_CONTENT: Record<string, { description: string; content: string }> = {
  'query-competitions': {
    description: 'Query competition listings for a Basque pelota league from the Pilotariak platform.',
    content: `# query-competitions

Query competition listings for a Basque pelota league from the Pilotariak platform
via the Azkena MCP server.

## When to use

Use this skill when the user asks about current competitions, championships, or
tournaments for Basque pelota (Pelote Basque / Pilota Euskalduna).

## MCP Tool

Call \`list_competitions\` with:

| Parameter | Type     | Required | Values                               |
| --------- | -------- | -------- | ------------------------------------ |
| \`league\`  | string   | yes      | \`lcapb\` · \`lidfpb\` · \`ccapb\` · \`ctpb\` |

## Returns

JSON array of competitions:

\`\`\`json
[{ "id": "5", "name": "Championnat LCAPB 2025-2026", "source_id": "lcapb-2025" }]
\`\`\`

## Example

\`\`\`
list_competitions(league: "lcapb")
\`\`\`
`,
  },

  'query-results': {
    description:
      'Query match results for a Basque pelota league with optional filters for competition, specialty, category, and phase.',
    content: `# query-results

Query match results for a Basque pelota league from the Pilotariak platform
via the Azkena MCP server.

## When to use

Use this skill when the user asks about match scores, results, club lineups,
or who played against whom.

## MCP Tool Workflow

1. Call \`list_competitions\` to resolve the competition ID
2. Optionally call \`list_specialties\` / \`list_categories\` for additional filter IDs
3. Call \`list_results\` with the resolved IDs

### list_results parameters

| Parameter       | Type   | Required | Description                                        |
| --------------- | ------ | -------- | -------------------------------------------------- |
| \`league\`        | string | yes      | \`lcapb\` · \`lidfpb\` · \`ccapb\` · \`ctpb\`              |
| \`competitionId\` | string | no       | Filter by competition (from list_competitions)     |
| \`specialtyId\`   | string | no       | Filter by discipline (from list_specialties)       |
| \`categoryId\`    | string | no       | Filter by division/series (from list_categories)   |
| \`phase\`         | string | no       | e.g. "Finale", "Demi-finale", "Poule"              |

## Returns

JSON array of results with clubs, scores, lineups, specialty, category, and date.
`,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonOk(data: unknown): Response {
  return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Handle /.well-known/* discovery routes.
 * Returns a Response when the path matches, null otherwise.
 */
export async function handleWellKnown(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;
  const base = `${url.protocol}//${url.host}`;

  // ── API Catalog (IETF draft-ietf-httpapi-api-catalog) ────────────────────
  if (pathname === '/.well-known/api-catalog') {
    return new Response(
      JSON.stringify({
        linkset: [
          {
            anchor: `${base}/`,
            'service-desc': [{ href: `${base}/mcp`, type: 'application/json' }],
            'service-doc': [
              {
                href: 'https://github.com/pilotariak/azkena/blob/main/AGENTS.md',
                type: 'text/markdown',
                title: 'Developer guide',
              },
              { href: 'https://github.com/pilotariak/azkena', type: 'text/html' },
            ],
            'service-meta': [
              {
                href: `${base}/.well-known/ai-catalog.json`,
                type: 'application/json',
                title: 'AI catalog (ARD)',
              },
              {
                href: `${base}/.well-known/mcp/server-card.json`,
                type: 'application/json',
                title: 'MCP Server Card',
              },
              {
                href: `${base}/.well-known/agent-skills/index.json`,
                type: 'application/json',
                title: 'Agent Skills Index',
              },
            ],
            license: [{ href: 'https://github.com/pilotariak/azkena/blob/main/LICENSE' }],
          },
        ],
      }),
      {
        headers: {
          'Content-Type': 'application/linkset+json',
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  }

  // ── AI Catalog (ARD) ──────────────────────────────────────────────────────
  if (pathname === '/.well-known/ai-catalog.json') {
    return jsonOk({
      specVersion: '1.0',
      host: { displayName: 'Azkena — Pilotariak MCP server', identifier: url.host },
      entries: [
        {
          identifier: `urn:ai:${url.host}:mcp-server:azkena`,
          displayName: 'Azkena MCP server',
          type: 'application/mcp-server+json',
          url: `${base}/.well-known/mcp/server-card.json`,
          description:
            'Read-only MCP server exposing Basque pelota competition data ' +
            '(competitions, clubs, results, categories, specialties).',
        },
        {
          identifier: `urn:ai:${url.host}:skills:index`,
          displayName: 'Azkena Agent Skills',
          type: 'application/agent-skills+json',
          url: `${base}/.well-known/agent-skills/index.json`,
          description: 'Index of agent skills published by Azkena.',
        },
      ],
    });
  }

  // ── MCP Server Card ───────────────────────────────────────────────────────
  if (pathname === '/.well-known/mcp/server-card.json') {
    return jsonOk({
      $schema: 'https://modelcontextprotocol.io/schemas/server-card/2025-10.json',
      serverInfo: {
        name: 'azkena',
        title: 'Azkena — Pilotariak MCP server',
        version: '0.1.0',
        description:
          'Read-only MCP server for the Pilotariak Basque pelota platform. ' +
          'Exposes competitions, clubs, categories, specialties, and match results ' +
          'for leagues: lcapb, lidfpb, ccapb, ctpb.',
      },
      transport: {
        type: 'streamable-http',
        endpoint: `${base}/mcp`,
      },
      capabilities: { tools: { listChanged: false } },
      tools: TOOL_CATALOG,
      meta: {
        homepage: 'https://github.com/pilotariak/azkena',
        mcpEndpoint: `${base}/mcp`,
        agentSkills: `${base}/.well-known/agent-skills/index.json`,
        apiCatalog: `${base}/.well-known/api-catalog`,
        contact: 'nicolas.lamirault@gmail.com',
        languages: ['fr', 'en', 'eu'],
        sourceCode: 'https://github.com/pilotariak/azkena',
      },
    });
  }

  // ── Agent Skills Index ────────────────────────────────────────────────────
  if (pathname === '/.well-known/agent-skills/index.json') {
    const skills = await Promise.all(
      Object.entries(SKILL_CONTENT).map(async ([name, skill]) => ({
        name,
        type: 'skill-md',
        description: skill.description,
        url: `${base}/.well-known/agent-skills/${name}/SKILL.md`,
        digest: `sha256:${await sha256Hex(skill.content)}`,
      })),
    );
    return jsonOk({
      $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
      skills,
    });
  }

  // ── Individual SKILL.md files ─────────────────────────────────────────────
  const skillMatch = pathname.match(/^\/.well-known\/agent-skills\/([^/]+)\/SKILL\.md$/);
  if (skillMatch) {
    const name = skillMatch[1]!;
    const skill = SKILL_CONTENT[name];
    if (!skill) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(skill.content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return null;
}
