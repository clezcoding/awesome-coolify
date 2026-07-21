import { describe, expect, it } from 'vitest';
import * as z from 'zod/v4';
import { CoolifyApiError } from '../../utils/errors.js';
import {
  sharedReadParamsSchema,
  parseReadParams,
  parseWithInstanceRouting,
} from './shared-read-params.js';

describe('parseWithInstanceRouting', () => {
  const actionSchema = z
    .object({
      action: z.literal('health'),
    })
    .strict();

  it('maps invalid instance slug to CoolifyApiError COOLIFY_VALIDATION_ERROR (WR-03)', () => {
    expect(() =>
      parseWithInstanceRouting(actionSchema, { action: 'health', instance: 'PROD' }),
    ).toThrow(CoolifyApiError);

    try {
      parseWithInstanceRouting(actionSchema, { action: 'health', instance: 'PROD' });
      expect.fail('expected CoolifyApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(CoolifyApiError);
      expect((error as CoolifyApiError).envelope.code).toBe('COOLIFY_VALIDATION_ERROR');
    }
  });

  it('returns parsed data with valid optional instance', () => {
    const parsed = parseWithInstanceRouting(actionSchema, {
      action: 'health',
      instance: 'prod',
    });
    expect(parsed).toEqual({ action: 'health', instance: 'prod' });
  });
});

describe('sharedReadParamsSchema', () => {
  it('defaults format pretty page 1 per_page 10 max_chars 16000 per D-09 D-13 D-15', () => {
    const parsed = parseReadParams({});
    expect(parsed.format).toBe('pretty');
    expect(parsed.projection).toBe('summary');
    expect(parsed.page).toBe(1);
    expect(parsed.per_page).toBe(10);
    expect(parsed.max_chars).toBe(16000);
  });

  it('defaults reveal to false and accepts reveal true', () => {
    expect(parseReadParams({}).reveal).toBe(false);
    expect(parseReadParams({ reveal: true }).reveal).toBe(true);
  });

  it('returns projection full when include_full true regardless of projection per D-07', () => {
    const parsed = parseReadParams({
      projection: 'summary',
      include_full: true,
    });
    expect(parsed.projection).toBe('full');
    expect(parsed.include_full).toBe(true);
  });

  it('returns projection full when projection full and include_full false', () => {
    const parsed = parseReadParams({
      projection: 'full',
      include_full: false,
    });
    expect(parsed.projection).toBe('full');
  });

  it('accepts explicit format table and json', () => {
    expect(parseReadParams({ format: 'table' }).format).toBe('table');
    expect(parseReadParams({ format: 'json' }).format).toBe('json');
  });

  it('spreads into Zod discriminatedUnion action objects without key collision', () => {
    const actionSchema = {
      action: { _def: { typeName: 'ZodLiteral' } },
      ...sharedReadParamsSchema,
    };
    expect(actionSchema).toHaveProperty('format');
    expect(actionSchema).toHaveProperty('projection');
    expect(actionSchema).toHaveProperty('include_full');
    expect(actionSchema).toHaveProperty('page');
    expect(actionSchema).toHaveProperty('per_page');
    expect(actionSchema).toHaveProperty('max_chars');
    expect(actionSchema).toHaveProperty('reveal');
    expect(actionSchema).toHaveProperty('action');
  });
});
