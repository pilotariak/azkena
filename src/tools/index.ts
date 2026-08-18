/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Env } from '../types.js';
import { registerCategoriesTools } from './categories.js';
import { registerClubsTools } from './clubs.js';
import { registerCompetitionsTools } from './competitions.js';
import { registerResultsTools } from './results.js';
import { registerSpecialtiesTools } from './specialties.js';

export function registerTools(server: McpServer, env: Env): void {
  registerCompetitionsTools(server, env);
  registerClubsTools(server, env);
  registerCategoriesTools(server, env);
  registerSpecialtiesTools(server, env);
  registerResultsTools(server, env);
}
