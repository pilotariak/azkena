/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listCompetitions } from '../frontis/client.js';
import type { Env } from '../types.js';
import { LEAGUE, READ_ONLY, toolError } from './common.js';

export function registerCompetitionsTools(server: McpServer, env: Env): void {
  server.tool(
    'list_competitions',
    'List all competitions for a Basque pelota league. Returns competition IDs and names.',
    { league: LEAGUE },
    READ_ONLY,
    async ({ league }) => {
      try {
        const competitions = await listCompetitions(env.FRONTIS_URL, league);
        return { content: [{ type: 'text', text: JSON.stringify(competitions, null, 2) }] };
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
