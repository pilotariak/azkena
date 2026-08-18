/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const LEAGUE = z
  .enum(['lcapb', 'lidfpb', 'ccapb', 'ctpb'])
  .describe('League code (lcapb · lidfpb · ccapb · ctpb)');

// All azkena tools are read-only: they never mutate data on the Frontis backend.
export const READ_ONLY = { readOnlyHint: true } as const;

export function toolError(err: unknown): { isError: true; content: [{ type: 'text'; text: string }] } {
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: 'text', text: message }] };
}
