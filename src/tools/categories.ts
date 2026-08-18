/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listCategories } from '../frontis/client.js';
import type { Env } from '../types.js';
import { LEAGUE, READ_ONLY, toolError } from './common.js';

export function registerCategoriesTools(server: McpServer, env: Env): void {
  server.tool(
    'list_categories',
    'List player categories (divisions/series) for a Basque pelota league. Use the returned IDs when filtering results.',
    { league: LEAGUE },
    READ_ONLY,
    async ({ league }) => {
      try {
        const categories = await listCategories(env.FRONTIS_URL, league);
        return { content: [{ type: 'text', text: JSON.stringify(categories, null, 2) }] };
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
