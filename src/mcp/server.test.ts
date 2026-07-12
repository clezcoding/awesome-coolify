import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { metaActionSchema } from './tools/meta.js';
import { systemActionSchema } from './tools/system.js';

describe('MCP server tool registration', () => {
  it('registers exactly system and meta tools', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/mcp/server.ts'),
      'utf8',
    );
    const matches = source.match(/registerTool\(/g) ?? [];
    expect(matches.length).toBe(2);
    expect(source).toContain("registerTool(\n    'system'");
    expect(source).toContain("registerTool(\n    'meta'");
  });

  it('uses discriminatedUnion schemas that reject unknown actions', () => {
    expect(systemActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
    expect(metaActionSchema.safeParse({ action: 'invalid' }).success).toBe(
      false,
    );
  });
});
