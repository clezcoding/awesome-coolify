import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { metaActionSchema } from './tools/meta.js';
import { systemActionSchema } from './tools/system.js';
import { resourceActionSchema } from './tools/resource.js';
import { applicationActionSchema } from './tools/application.js';
import { serviceActionSchema } from './tools/service.js';
import { databaseActionSchema } from './tools/database.js';
import { docsActionSchema } from './tools/docs.js';

describe('MCP server tool registration', () => {
  it('registers system meta resource application service database and docs tools', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    const matches = source.match(/registerTool\(/g) ?? [];
    expect(matches.length).toBe(7);
    expect(source).toContain("registerTool(\n    'system'");
    expect(source).toContain("registerTool(\n    'meta'");
    expect(source).toContain("registerTool(\n    'resource'");
    expect(source).toContain("registerTool(\n    'application'");
    expect(source).toContain("registerTool(\n    'service'");
    expect(source).toContain("registerTool(\n    'database'");
    expect(source).toContain("registerTool(\n    'docs'");
  });

  it('uses discriminatedUnion schemas that reject unknown actions', () => {
    expect(systemActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
    expect(metaActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
    expect(resourceActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
    expect(
      applicationActionSchema.safeParse({ action: 'invalid' }).success,
    ).toBe(false);
    expect(serviceActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
    expect(databaseActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
    expect(docsActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
  });

  it('registers read tools with readOnlyHint true per D-22', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    for (const tool of [
      'resource',
      'application',
      'service',
      'database',
      'docs',
    ]) {
      expect(source).toContain(`registerTool(\n    '${tool}'`);
      expect(source).toMatch(
        new RegExp(`'${tool}'[\\s\\S]*readOnlyHint:\\s*true`),
      );
    }
  });

  it('domain tools expose get-only actions per D-02', () => {
    expect(
      applicationActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(false);
    expect(serviceActionSchema.safeParse({ action: 'list' }).success).toBe(
      false,
    );
    expect(databaseActionSchema.safeParse({ action: 'list' }).success).toBe(
      false,
    );
    expect(
      applicationActionSchema.safeParse({
        action: 'get',
        uuid: 'uuid-1',
      }).success,
    ).toBe(true);
  });

  it('resource schema includes list and find actions', () => {
    expect(resourceActionSchema.safeParse({ action: 'list' }).success).toBe(
      true,
    );
    expect(
      resourceActionSchema.safeParse({ action: 'find', query: 'test' }).success,
    ).toBe(true);
  });
});
