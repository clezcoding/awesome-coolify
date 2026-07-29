#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pngPath = resolve(root, 'docs/assets/mcp-icon-192.png');
const outPath = resolve(root, 'src/mcp/mcp-icon-data.ts');

const b64 = readFileSync(pngPath).toString('base64');
writeFileSync(
  outPath,
  `// Auto-generated — do not edit\nexport const MCP_ICON_192_BASE64 = ${JSON.stringify(b64)};\n`,
);
