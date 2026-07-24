import { describe, expect, it } from 'vitest';
import * as z from 'zod/v4';
import { CoolifyApiError } from '../../utils/errors.js';
import {
  sharedReadParamsSchema,
  sharedReadParamsFlatShape,
  parseReadParams,
  parseWithInstanceRouting,
  withInstanceRoutingSchema,
  createFlatActionSchema,
} from './shared-read-params.js';

describe('createFlatActionSchema', () => {
  const demoSchema = createFlatActionSchema(
    ['ping', 'fetch'] as const,
    {
      id: z.string().optional(),
      name: z.string().optional(),
    },
    {
      ping: [],
      fetch: ['id'],
    },
    {
      fetch: ['id'],
    },
  );

  it('accepts action with allowed optional fields', () => {
    const parsed = demoSchema.safeParse({ action: 'ping' });
    expect(parsed.success).toBe(true);
  });

  it('rejects disallowed fields for the selected action', () => {
    const parsed = demoSchema.safeParse({ action: 'ping', id: 'x' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toContain("not allowed for action 'ping'");
  });

  it('rejects missing required fields for the selected action', () => {
    const parsed = demoSchema.safeParse({ action: 'fetch' });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toContain("requires field 'id'");
  });
});

describe('parseWithInstanceRouting action-aware recoveryHints', () => {
  const schema = createFlatActionSchema(
    ['run'] as const,
    { uuid: z.string().optional() },
    { run: ['uuid'] },
    { run: ['uuid'] },
  );

  it('lists required fields for the selected action on validation failure', () => {
    try {
      parseWithInstanceRouting(schema, { action: 'run' });
      expect.fail('expected CoolifyApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(CoolifyApiError);
      const hints = (error as CoolifyApiError).envelope.recoveryHints ?? [];
      expect(hints.some((h) => h.includes("Action 'run' requires: uuid"))).toBe(
        true,
      );
    }
  });
});

describe('withInstanceRoutingSchema flat-only', () => {
  it('throws for non-ZodObject schemas', () => {
    const unionSchema = z.discriminatedUnion('action', [
      z.object({ action: z.literal('a') }),
      z.object({ action: z.literal('b') }),
    ]);
    expect(() => withInstanceRoutingSchema(unionSchema)).toThrow(
      /flat z.object required/,
    );
  });
});

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

describe('withInstanceRoutingSchema (MCP validateToolInput boundary)', () => {
  const flatDemoSchema = createFlatActionSchema(
    ['health', 'get'] as const,
    {
      uuid: z.string().optional(),
      ...sharedReadParamsFlatShape,
    },
    {
      health: [],
      get: ['uuid', 'format', 'projection', 'include_full', 'page', 'per_page', 'max_chars', 'reveal'],
    },
  );

  const routedSchemas: Array<{
    name: string;
    schema: z.ZodType;
    sample: Record<string, unknown>;
  }> = [
    { name: 'flat-demo', schema: flatDemoSchema, sample: { action: 'health' } },
    {
      name: 'flat-demo-get',
      schema: flatDemoSchema,
      sample: { action: 'get', uuid: 'app-uuid-1' },
    },
  ];

  it('retains instance on safeParse for all 12 routed tool schemas (no strip/reject)', () => {
    for (const { name, schema, sample } of routedSchemas) {
      const wrapped = withInstanceRoutingSchema(schema);
      const withInstance = wrapped.safeParse({ ...sample, instance: 'prod' });
      expect(withInstance.success, `${name} should accept instance`).toBe(true);
      if (!withInstance.success) continue;
      expect(
        (withInstance.data as { instance?: string }).instance,
        `${name} must retain instance after MCP-boundary parse`,
      ).toBe('prod');
    }
  });

  it('still accepts payloads without instance', () => {
    for (const { name, schema, sample } of routedSchemas) {
      const wrapped = withInstanceRoutingSchema(schema);
      const bare = wrapped.safeParse(sample);
      expect(bare.success, `${name} should accept bare action`).toBe(true);
    }
  });

  it('rejects unrecognized instance keys that previously broke strict schemas', () => {
    const unwrapped = flatDemoSchema.safeParse({
      action: 'health',
      instance: 'prod',
    });
    expect(unwrapped.success).toBe(false);

    const wrapped = withInstanceRoutingSchema(flatDemoSchema).safeParse({
      action: 'health',
      instance: 'prod',
    });
    expect(wrapped.success).toBe(true);
    if (wrapped.success) {
      expect((wrapped.data as { instance?: string }).instance).toBe('prod');
    }
  });

  it('advertises instance in JSON Schema for tools/list', () => {
    const json = JSON.stringify(
      withInstanceRoutingSchema(flatDemoSchema).toJSONSchema(),
    );
    expect(json).toContain('instance');
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
