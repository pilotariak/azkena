/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listSpecialties } from '../frontis/client.js';
import type { Env } from '../types.js';

const LEAGUE = z
  .enum(['lcapb', 'lidfpb', 'ccapb', 'ctpb'])
  .describe('League code (lcapb · lidfpb · ccapb · ctpb)');

export function registerSpecialtiesTools(server: McpServer, env: Env): void {
  server.tool(
    'list_specialties',
    'List Basque pelota disciplines (trinquet, chistera, place libre, etc.) for a league. Use returned IDs when filtering results.',
    { league: LEAGUE },
    async ({ league }) => {
      const specialties = await listSpecialties(env.FRONTIS_URL, league);
      return {
        content: [{ type: 'text', text: JSON.stringify(specialties, null, 2) }],
      };
    },
  );
}
