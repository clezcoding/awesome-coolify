import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import type { EnvConfig } from '../config/env.js';
import { registerCoolifyTools } from './server.js';
import { metaActionSchema } from './tools/meta.js';
import { systemActionSchema } from './tools/system.js';
import { resourceActionSchema } from './tools/resource.js';
import { applicationActionSchema, applicationActionsCatalog } from './tools/application.js';
import { serviceActionSchema, serviceActionsCatalog } from './tools/service.js';
import { databaseActionSchema, databaseActionsCatalog } from './tools/database.js';
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
  it('registers system meta resource diagnose application deployment service database private_key instance manifest server project environment and docs tools', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    const matches = source.match(/registerTool\(/g) ?? [];
    expect(matches.length).toBe(16);
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
    expect(source).toContain("registerTool(\n    'instance'");
    expect(source).toMatch(/handleInstanceAction\(args,\s*env\)/);
    expect(source).toContain("registerTool(\n    'manifest'");
    expect(source).toMatch(/handleManifestAction\(args,\s*env\)/);
    expect(source).toContain("registerTool(\n    'server'");
    expect(source).toContain("registerTool(\n    'project'");
    expect(source).toContain("registerTool(\n    'environment'");
    expect(source).toContain("registerTool(\n    'docs'");
  });

  it('wraps 12 routed tool inputSchemas with withInstanceRoutingSchema (MCP boundary)', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    expect(source).toContain(
      "import { withInstanceRoutingSchema } from './tools/shared-read-params.js'",
    );
    const routed = [
      'systemActionSchema',
      'resourceActionSchema',
      'diagnoseToolSchema',
      'applicationActionSchema',
      'emergencyToolSchema',
      'deploymentToolSchema',
      'serviceActionSchema',
      'databaseActionSchema',
      'privateKeyActionSchema',
      'serverActionSchema',
      'projectActionSchema',
      'environmentActionSchema',
    ];
    for (const schema of routed) {
      expect(source).toContain(`withInstanceRoutingSchema(${schema})`);
    }
    // meta/docs/instance intentionally unwrapped (no Coolify routing)
    expect(source).toContain('inputSchema: metaActionSchema');
    expect(source).toContain('inputSchema: docsActionSchema');
    expect(source).toContain('inputSchema: instanceActionSchema');
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
    expect(deploymentBlock).toContain('deploymentActionsCatalog');
  });

  it('diagnose tool has openWorldHint without readOnlyHint per D-10', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    expect(source).toContain("registerTool(\n    'diagnose'");
    expect(source).toMatch(/'diagnose'[\s\S]*openWorldHint:\s*true/);
    expect(source).toMatch(/'diagnose'[\s\S]*diagnoseActionsCatalog/);
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
    // Read-only tools: system/meta/resource/docs. Mutable domain tools must not match.
    for (const tool of ['system', 'meta', 'resource', 'docs']) {
      expect(source).toContain(`registerTool(\n    '${tool}'`);
      const start = source.indexOf(`registerTool(\n    '${tool}'`);
      expect(start).toBeGreaterThanOrEqual(0);
      const next = source.indexOf('registerTool(', start + 1);
      const toolBlock = next === -1 ? source.slice(start) : source.slice(start, next);
      expect(toolBlock).toMatch(/readOnlyHint:\s*true/);
    }
    for (const tool of ['application', 'service', 'database']) {
      expect(source).toContain(`registerTool(\n    '${tool}'`);
      const start = source.indexOf(`registerTool(\n    '${tool}'`);
      expect(start).toBeGreaterThanOrEqual(0);
      const next = source.indexOf('registerTool(', start + 1);
      const toolBlock = next === -1 ? source.slice(start) : source.slice(start, next);
      expect(toolBlock).not.toMatch(/readOnlyHint:\s*true/);
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

  it('every registered tool description contains Actions: and Safety: prefixes', () => {
    const testEnv: EnvConfig = {
      COOLIFY_URL: 'https://coolify.example.com',
      COOLIFY_TOKEN: 'test-token',
      COOLIFY_VERIFY_SSL: true,
      COOLIFY_MCP_LOG: 'info',
    };
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyTools(server, testEnv);
    type RegisteredTool = { description?: string };
    const registered = (
      server as McpServer & {
        _registeredTools: Record<string, RegisteredTool>;
      }
    )._registeredTools;
    const expectedTools = [
      'system',
      'meta',
      'resource',
      'diagnose',
      'application',
      'emergency',
      'deployment',
      'service',
      'database',
      'private_key',
      'instance',
      'manifest',
      'server',
      'project',
      'environment',
      'docs',
    ];
    expect(Object.keys(registered).sort()).toEqual(expectedTools.sort());
    for (const name of expectedTools) {
      const description = registered[name]?.description ?? '';
      expect(description, `${name} missing Actions:`).toContain('Actions:');
      expect(description, `${name} missing Safety:`).toContain('Safety:');
    }
  });
});

describe('actionsCatalog schema-field-name regression (Phase 19 gap closure)', () => {
  it('applicationActionsCatalog uses env_uuid for envs:delete (CR-01)', () => {
    expect(applicationActionsCatalog).toContain(
      'envs:delete(uuid, env_uuid, confirm)',
    );
  });

  it('applicationActionsCatalog uses entries for envs:bulk-update (CR-01)', () => {
    expect(applicationActionsCatalog).toContain(
      'envs:bulk-update(uuid, entries, confirm)',
    );
  });

  it('applicationActionsCatalog includes CRUD lifecycle tokens (WR-01)', () => {
    expect(applicationActionsCatalog).toContain('create(source_type, server_uuid)');
    expect(applicationActionsCatalog).toContain('update(uuid)');
    expect(applicationActionsCatalog).toContain('delete(uuid, confirm)');
    expect(applicationActionsCatalog).toContain('delete_preview(uuid)');
  });

  it('serviceActionsCatalog uses env_uuid for envs:delete (CR-01)', () => {
    expect(serviceActionsCatalog).toContain(
      'envs:delete(uuid, env_uuid, confirm)',
    );
  });

  it('serviceActionsCatalog includes restart and delete_preview', () => {
    expect(serviceActionsCatalog).toContain('restart(uuid)');
    expect(serviceActionsCatalog).toContain('delete_preview(uuid)');
  });

  it('databaseActionsCatalog uses schema field names for env mutations (WR-02)', () => {
    expect(databaseActionsCatalog).toContain(
      'envs:delete(uuid?, env_uuid, confirm)',
    );
    expect(databaseActionsCatalog).toContain(
      'envs:bulk-update(uuid?, entries, confirm)',
    );
  });

  it('no catalog advertises envs:delete with key alias (CR-01 negative)', () => {
    expect(applicationActionsCatalog).not.toContain('envs:delete(uuid, key');
    expect(serviceActionsCatalog).not.toContain('envs:delete(uuid, key');
    expect(databaseActionsCatalog).not.toContain('envs:delete(uuid, key');
  });

  it('applicationActionsCatalog does not advertise envs alias for bulk-update (CR-01 negative)', () => {
    expect(applicationActionsCatalog).not.toContain('envs:bulk-update(uuid, envs');
  });

  it('databaseActionsCatalog has no envs:* or backup:* wildcards (WR-02 negative)', () => {
    expect(databaseActionsCatalog).not.toContain('envs:*');
    expect(databaseActionsCatalog).not.toContain('backup:*');
  });
});

describe('McpServer branding metadata', () => {
  const serverSourcePath = resolve(process.cwd(), 'src/mcp/server.ts');
  const packageDescription = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
  ).description as string;

  function readServerSource(): string {
    return readFileSync(serverSourcePath, 'utf8');
  }

  function mcpServerConstructorBlock(source: string): string {
    const start = source.indexOf('new McpServer({');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = source.indexOf('});', start);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end + 3);
  }

  it('source contains title: Awesome Coolify (BRND-01)', () => {
    expect(readServerSource()).toContain("title: 'Awesome Coolify'");
  });

  it(
    'source contains websiteUrl https://github.com/clezcoding/awesome-coolify (BRND-01)',
    () => {
      expect(readServerSource()).toContain(
        "websiteUrl: 'https://github.com/clezcoding/awesome-coolify'",
      );
    },
  );

  it('McpServer constructor block contains description key (BRND-03)', () => {
    const block = mcpServerConstructorBlock(readServerSource());
    expect(block).toMatch(/\bdescription:/);
  });

  it(
    'McpServer constructor block contains icons with jsDelivr PNG URL (BRND-03)',
    () => {
      const block = mcpServerConstructorBlock(readServerSource());
      expect(block).toMatch(/\bicons:/);
      expect(block).toContain(
        'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
      );
    },
  );

  it(
    'McpServer constructor block contains mimeType image/png and sizes 192x192 (BRND-03)',
    () => {
      const block = mcpServerConstructorBlock(readServerSource());
      expect(block).toContain("mimeType: 'image/png'");
      expect(block).toContain("sizes: ['192x192']");
    },
  );

  it(
    'package.json description appears verbatim in server.ts source (BRND-03)',
    () => {
      expect(readServerSource()).toContain(packageDescription);
    },
  );
});
