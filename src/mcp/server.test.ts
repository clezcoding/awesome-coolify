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
import { diagnoseToolSchema } from './tools/diagnose.js';
import { deploymentToolSchema } from './tools/deployment.js';
import { toolOutputSchema } from './server.js';

describe('toolOutputSchema', () => {
  it('accepts ReadResponse-shaped structuredContent with _meta', () => {
    const result = toolOutputSchema.safeParse({
      ok: true,
      data: { critical: [], high: [], info: [] },
      _meta: {
        truncated: false,
        chars: 100,
        max_chars: 10000,
        page: 1,
        per_page: 10,
        total: 0,
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal _meta without pagination fields', () => {
    const result = toolOutputSchema.safeParse({
      ok: true,
      data: {},
      _meta: { truncated: false, chars: 0, max_chars: 10000 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts error path without _meta', () => {
    const result = toolOutputSchema.safeParse({
      ok: false,
      error: { code: 'COOLIFY_422', message: 'Invalid projection' },
    });
    expect(result.success).toBe(true);
  });
});

describe('MCP server tool registration', () => {
  it('registers system meta resource diagnose application deployment service database private_key server and docs tools', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    const matches = source.match(/registerTool\(/g) ?? [];
    expect(matches.length).toBe(12);
    expect(source).toContain("registerTool(\n    'system'");
    expect(source).toContain("registerTool(\n    'meta'");
    expect(source).toContain("registerTool(\n    'resource'");
    expect(source).toContain("registerTool(\n    'diagnose'");
    expect(source).toContain("registerTool(\n    'application'");
    expect(source).toContain("registerTool(\n    'emergency'");
    expect(source).toContain("registerTool(\n    'deployment'");
    expect(source).toContain("registerTool(\n    'service'");
    expect(source).toContain("registerTool(\n    'database'");
    expect(source).toContain("registerTool(\n    'private_key'");
    expect(source).toContain("registerTool(\n    'server'");
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
    expect(
      diagnoseToolSchema.safeParse({ action: 'invalid' }).success,
    ).toBe(false);
    expect(
      deploymentToolSchema.safeParse({ action: 'invalid' }).success,
    ).toBe(false);
  });

  it('deployment tool has openWorldHint without readOnlyHint per D-05', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    expect(source).toContain("registerTool(\n    'deployment'");
    const deploymentBlock = source.slice(
      source.indexOf("registerTool(\n    'deployment'"),
      source.indexOf("registerTool(\n    'service'"),
    );
    expect(deploymentBlock).toMatch(/openWorldHint:\s*true/);
    expect(deploymentBlock).not.toMatch(/readOnlyHint:\s*true/);
    expect(deploymentBlock).toMatch(/already_finished/);
  });

  it('diagnose tool has openWorldHint without readOnlyHint per D-10', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    expect(source).toContain("registerTool(\n    'diagnose'");
    expect(source).toMatch(/'diagnose'[\s\S]*openWorldHint:\s*true/);
    expect(source).toMatch(/'diagnose'[\s\S]*validate/);
    expect(source).toMatch(/'diagnose'[\s\S]*side-effect/);
    const diagnoseBlock = source.slice(
      source.indexOf("registerTool(\n    'diagnose'"),
      source.indexOf("registerTool(\n    'application'"),
    );
    expect(diagnoseBlock).not.toMatch(/readOnlyHint:\s*true/);
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
