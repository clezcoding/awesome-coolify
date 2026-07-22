import { describe, expect, it } from 'vitest';
import * as z from 'zod/v4';
import { CoolifyApiError } from '../../utils/errors.js';
import { applicationActionSchema } from './application.js';
import { databaseActionSchema } from './database.js';
import { deploymentToolSchema } from './deployment.js';
import { diagnoseToolSchema } from './diagnose.js';
import { emergencyToolSchema } from './emergency.js';
import { environmentActionSchema } from './environment.js';
import { privateKeyActionSchema } from './private_key.js';
import { projectActionSchema } from './project.js';
import { resourceActionSchema } from './resource.js';
import { serverActionSchema } from './server.js';
import { serviceActionSchema } from './service.js';
import {
  sharedReadParamsSchema,
  parseReadParams,
  parseWithInstanceRouting,
  withInstanceRoutingSchema,
} from './shared-read-params.js';
import { systemActionSchema } from './system.js';

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
  const routedSchemas: Array<{
    name: string;
    schema: z.ZodType;
    sample: Record<string, unknown>;
  }> = [
    { name: 'system', schema: systemActionSchema, sample: { action: 'health' } },
    {
      name: 'resource',
      schema: resourceActionSchema,
      sample: { action: 'find', query: 'x' },
    },
    { name: 'diagnose', schema: diagnoseToolSchema, sample: { action: 'scan' } },
    {
      name: 'application',
      schema: applicationActionSchema,
      sample: { action: 'get', uuid: 'app-uuid-1' },
    },
    {
      name: 'emergency',
      schema: emergencyToolSchema,
      sample: { action: 'stop_all', confirm: true },
    },
    {
      name: 'deployment',
      schema: deploymentToolSchema,
      sample: { action: 'list', application_uuid: 'app-uuid-1' },
    },
    {
      name: 'service',
      schema: serviceActionSchema,
      sample: { action: 'get', uuid: 'svc-uuid-1' },
    },
    {
      name: 'database',
      schema: databaseActionSchema,
      sample: { action: 'get', uuid: 'db-uuid-1' },
    },
    {
      name: 'private_key',
      schema: privateKeyActionSchema,
      sample: { action: 'list' },
    },
    {
      name: 'server',
      schema: serverActionSchema,
      sample: { action: 'get', uuid: 'srv-uuid-1' },
    },
    { name: 'project', schema: projectActionSchema, sample: { action: 'list' } },
    {
      name: 'environment',
      schema: environmentActionSchema,
      sample: { action: 'list', project_uuid: 'proj-uuid-1' },
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
    // Control: unwrapped strict private_key still rejects instance
    const unwrapped = privateKeyActionSchema.safeParse({
      action: 'list',
      instance: 'prod',
    });
    expect(unwrapped.success).toBe(false);

    const wrapped = withInstanceRoutingSchema(privateKeyActionSchema).safeParse({
      action: 'list',
      instance: 'prod',
    });
    expect(wrapped.success).toBe(true);
    if (wrapped.success) {
      expect((wrapped.data as { instance?: string }).instance).toBe('prod');
    }
  });

  it('advertises instance in JSON Schema for tools/list', () => {
    const json = JSON.stringify(
      withInstanceRoutingSchema(systemActionSchema).toJSONSchema(),
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
