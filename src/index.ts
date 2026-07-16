#!/usr/bin/env node
import { formatEnvLoadHint, loadEnv } from './config/env.js';
import { createAndConnectServer } from './mcp/server.js';

async function main(): Promise<void> {
  const env = loadEnv();
  await createAndConnectServer(env);
}

main().catch((error: unknown) => {
  console.error(`[awesome-coolify-mcp] Fatal:\n${formatEnvLoadHint(error)}`);
  process.exit(1);
});
