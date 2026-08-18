/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listCategories } from '../frontis/client.js';
import type { Env } from '../types.js';

const LEAGUE = z
  .enum(['lcapb', 'lidfpb', 'ccapb', 'ctpb'])
  .describe('League code (lcapb · lidfpb · ccapb · ctpb)');

export function registerCategoriesTools(server: McpServer, env: Env): void {
  server.tool(
    'list_categories',
    'List player categories (divisions/series) for a Basque pelota league. Use the returned IDs when filtering results.',
    { league: LEAGUE },
    async ({ league }) => {
      const categories = await listCategories(env.FRONTIS_URL, league);
      return {
        content: [{ type: 'text', text: JSON.stringify(categories, null, 2) }],
      };
    },
  );
}
