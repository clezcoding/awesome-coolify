import * as z from 'zod/v4';
import { resolveProjection, type ProjectionMode } from '../../utils/projections.js';
import { CoolifyApiError } from '../../utils/errors.js';

export const sharedReadParamsSchema = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .default('pretty')
    .describe('Output format style'),
  projection: z
    .enum(['summary', 'full'])
    .default('summary')
    .describe('Detail projection depth'),
  include_full: z
    .boolean()
    .optional()
    .describe('Alias for projection: full'),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number for pagination'),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Items per page'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .default(16000)
    .describe('Maximum characters in text response before truncation'),
};

const readParamsObjectSchema = z.object(sharedReadParamsSchema);

export type ReadParamsInput = z.input<typeof readParamsObjectSchema>;

export interface ParsedReadParams {
  format: 'pretty' | 'json' | 'table';
  projection: ProjectionMode;
  include_full?: boolean;
  page: number;
  per_page: number;
  max_chars: number;
}

export function rejectTableFormatOnFullProjection(
  format: 'pretty' | 'json' | 'table',
  projection: ProjectionMode,
): void {
  if (format === 'table' && projection === 'full') {
    throw new CoolifyApiError({
      code: 'COOLIFY_422',
      message:
        'format: table is not supported with projection: full on get actions',
      recoveryHints: [
        'Use format: pretty or format: json for full projection output.',
        'Use projection: summary for tabular display of operational fields.',
      ],
    });
  }
}

export function parseReadParams(input: ReadParamsInput): ParsedReadParams {
  const parsed = readParamsObjectSchema.parse(input);
  const projection = resolveProjection(
    parsed.projection,
    parsed.include_full,
  );
  return {
    format: parsed.format,
    projection,
    include_full: parsed.include_full,
    page: parsed.page,
    per_page: parsed.per_page,
    max_chars: parsed.max_chars,
  };
}
