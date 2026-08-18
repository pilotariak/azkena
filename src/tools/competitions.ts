/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listCompetitions } from '../frontis/client.js';
import type { Env } from '../types.js';

const LEAGUE = z
  .enum(['lcapb', 'lidfpb', 'ccapb', 'ctpb'])
  .describe('League code (lcapb · lidfpb · ccapb · ctpb)');

export function registerCompetitionsTools(server: McpServer, env: Env): void {
  server.tool(
    'list_competitions',
    'List all competitions for a Basque pelota league. Returns competition IDs and names.',
    { league: LEAGUE },
    async ({ league }) => {
      const competitions = await listCompetitions(env.FRONTIS_URL, league);
      return {
        content: [{ type: 'text', text: JSON.stringify(competitions, null, 2) }],
      };
    },
  );
}
