/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer, } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listSpecialties, } from '../frontis/client.js';
import type { Env, } from '../types.js';
import { LEAGUE, READ_ONLY, toolError, } from './common.js';

export function registerSpecialtiesTools(server: McpServer, env: Env,): void {
  server.tool(
    'list_specialties',
    'List Basque pelota disciplines (trinquet, chistera, place libre, etc.) for a league. Use returned IDs when filtering results.',
    { league: LEAGUE, },
    READ_ONLY,
    async ({ league, },) => {
      try {
        const specialties = await listSpecialties(env.FRONTIS_URL, league,);
        return {
          content: [{ type: 'text', text: JSON.stringify(specialties, null, 2,), },],
          _meta: { ttlMs: 3600000, cacheScope: 'public', },
        };
      } catch (err) {
        return toolError(err,);
      }
    },
  );
}
