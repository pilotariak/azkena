/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listClubs } from '../frontis/client.js';
import type { Env } from '../types.js';

const LEAGUE = z
  .enum(['lcapb', 'lidfpb', 'ccapb', 'ctpb'])
  .describe('League code (lcapb · lidfpb · ccapb · ctpb)');

export function registerClubsTools(server: McpServer, env: Env): void {
  server.tool(
    'list_clubs',
    'List all clubs registered in a Basque pelota league. Returns club IDs and names.',
    { league: LEAGUE },
    async ({ league }) => {
      const clubs = await listClubs(env.FRONTIS_URL, league);
      return {
        content: [{ type: 'text', text: JSON.stringify(clubs, null, 2) }],
      };
    },
  );
}
