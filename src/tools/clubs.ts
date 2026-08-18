/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listClubs } from '../frontis/client.js';
import type { Env } from '../types.js';
import { LEAGUE, READ_ONLY, toolError } from './common.js';

export function registerClubsTools(server: McpServer, env: Env): void {
  server.tool(
    'list_clubs',
    'List all clubs registered in a Basque pelota league. Returns club IDs and names.',
    { league: LEAGUE },
    READ_ONLY,
    async ({ league }) => {
      try {
        const clubs = await listClubs(env.FRONTIS_URL, league);
        return { content: [{ type: 'text', text: JSON.stringify(clubs, null, 2) }] };
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
