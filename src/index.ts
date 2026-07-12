#!/usr/bin/env node
import { loadEnv } from './config/env.js';
import { createAndConnectServer } from './mcp/server.js';

async function main(): Promise<void> {
  const env = loadEnv();
  await createAndConnectServer(env);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[coolify-mcp] Fatal: ${message}`);
  process.exit(1);
});
