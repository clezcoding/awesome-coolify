import type { EnvConfig } from '../config/env.js';

export type LogLevel = EnvConfig['COOLIFY_MCP_LOG'];

export function createLogger(level: LogLevel) {
  return {
    debug(message: string): void {
      if (level === 'debug') {
        console.error(`[DEBUG] ${message}`);
      }
    },
    info(message: string): void {
      if (level === 'debug' || level === 'info') {
        console.error(`[INFO] ${message}`);
      }
    },
    error(message: string): void {
      console.error(`[ERROR] ${message}`);
    },
    httpDebug(path: string, status: number): void {
      if (level === 'debug') {
        console.error(`[DEBUG] ${path} ${status}`);
      }
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
