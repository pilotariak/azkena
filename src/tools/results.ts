/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listResults } from '../frontis/client.js';
import type { Env } from '../types.js';
import { LEAGUE, READ_ONLY, toolError } from './common.js';

export function registerResultsTools(server: McpServer, env: Env): void {
  server.tool(
    'list_results',
    'List match results for a league, optionally filtered by competition, specialty, category, or phase. ' +
      'Obtain IDs first via list_competitions, list_specialties, list_categories.',
    {
      league: LEAGUE,
      competitionId: z.string().optional().describe('Filter by competition ID'),
      specialtyId: z.string().optional().describe('Filter by specialty (discipline) ID'),
      categoryId: z.string().optional().describe('Filter by category (division/series) ID'),
      phase: z.string().optional().describe('Filter by phase name (e.g. "Finale", "Demi-finale")'),
    },
    READ_ONLY,
    async ({ league, competitionId, specialtyId, categoryId, phase }) => {
      try {
        const results = await listResults(env.FRONTIS_URL, league, {
          competitionId,
          specialtyId,
          categoryId,
          phase,
        });
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
