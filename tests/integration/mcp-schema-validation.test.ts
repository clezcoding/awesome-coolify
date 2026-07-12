/**
 * MCP schema validation integration test — spawns dist/index.js as child process.
 *
 * Pre-fix failure contract (verified 2026-07-12): running this test against
 * pre-Task-1 toolOutputSchema (without _meta in JSON Schema properties) fails
 * the client-side mirror assertion: structuredContent includes _meta but
 * outputJsonSchema.properties lacks _meta (additionalProperties:false rejects
 * _meta — same failure mode as live Cursor MCP -32602 documented in 03-UAT.md).
 * MCP SDK in-process validation may still return ok:true (zod strips unknown keys),
 * but this test catches the schema/ReadResponse mismatch via JSON Schema parity.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';
import {
  mockMixedServers,
  mockMixedResources,
  mockMixedAppEnvs,
  mockMixedAppDeployments,
  mockMixedServerResources,
  mockMixedServerDomains,
} from '../fixtures/coolify-mixed-health.js';
import { toolOutputSchema } from '../../src/mcp/server.js';
import * as z from 'zod/v4';

const mockHealthyApp = {
  uuid: 'app-unhealthy',
  name: 'failing-node-app',
  status: 'unhealthy',
  health_check_status: 'unhealthy',
  fqdn: 'https://fail.example.com',
  project: { name: 'prod', uuid: 'proj-1' },
  server: { name: 'online-node', uuid: 'srv-online' },
  updated_at: '2026-07-12T02:30:00.000Z',
};

const mockOfflineServer = {
  uuid: 'srv-offline',
  name: 'offline-node',
  ip: '1.2.3.4',
  settings: { is_reachable: false },
  updated_at: '2026-07-12T01:00:00.000Z',
};

const mockProjects = [{ uuid: 'proj-1', name: 'prod' }];

interface JsonRpcResponse {
  jsonrpc: string;
  id?: number;
  result?: {
    structuredContent?: {
      ok?: boolean;
      data?: Record<string, unknown>;
      error?: { code?: string | number; message?: string };
    };
  };
  error?: { code?: number; message?: string };
}

function createMockHandler() {
  return (
    req: import('node:http').IncomingMessage,
    res: import('node:http').ServerResponse,
  ) => {
    const url = req.url ?? '';
    const path = url.split('?')[0];

    const send = (body: unknown) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (path === '/api/v1/servers' && req.method === 'GET') {
      send(mockMixedServers);
      return;
    }
    if (path === '/api/v1/resources' && req.method === 'GET') {
      send(mockMixedResources);
      return;
    }
    if (path === '/api/v1/projects' && req.method === 'GET') {
      send(mockProjects);
      return;
    }
    if (
      path === '/api/v1/applications/app-unhealthy' &&
      req.method === 'GET'
    ) {
      send(mockHealthyApp);
      return;
    }
    if (
      path === '/api/v1/applications/app-unhealthy/envs' &&
      req.method === 'GET'
    ) {
      send(mockMixedAppEnvs);
      return;
    }
    if (
      path === '/api/v1/deployments/applications/app-unhealthy' &&
      req.method === 'GET'
    ) {
      send(mockMixedAppDeployments);
      return;
    }
    if (path === '/api/v1/servers/srv-offline' && req.method === 'GET') {
      send(mockOfflineServer);
      return;
    }
    if (
      path === '/api/v1/servers/srv-offline/resources' &&
      req.method === 'GET'
    ) {
      send(mockMixedServerResources);
      return;
    }
    if (
      path === '/api/v1/servers/srv-offline/domains' &&
      req.method === 'GET'
    ) {
      send(mockMixedServerDomains);
      return;
    }
    if (
      path === '/api/v1/servers/srv-offline/validate' &&
      req.method === 'GET'
    ) {
      send({ message: 'Validation started' });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found', path }));
  };
}

class McpStdioClient {
  private buffer = '';
  private pending = new Map<
    number,
    { resolve: (v: JsonRpcResponse) => void; reject: (e: Error) => void }
  >();
  private nextId = 1;

  constructor(private child: ChildProcessWithoutNullStreams) {
    child.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.drainBuffer();
    });
  }

  private drainBuffer(): void {
    let newlineIndex = this.buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        try {
          const msg = JSON.parse(line) as JsonRpcResponse;
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const handler = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            handler.resolve(msg);
          }
        } catch {
          // ignore non-JSON lines (e.g. log output)
        }
      }
      newlineIndex = this.buffer.indexOf('\n');
    }
  }

  async request(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for response id=${id} method=${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timeout);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      this.child.stdin.write(payload);
    });
  }

  notify(method: string, params?: Record<string, unknown>): void {
    const payload =
      JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    this.child.stdin.write(payload);
  }
}

describe('MCP schema validation via child process', () => {
  let httpServer: Server;
  let port: number;
  let child: ChildProcessWithoutNullStreams;
  let client: McpStdioClient;

  beforeAll(async () => {
    httpServer = createServer(createMockHandler());
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = httpServer.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('Failed to bind mock HTTP server');
    }
    port = addr.port;

    const distPath = resolve(process.cwd(), 'dist/index.js');
    child = spawn('node', [distPath], {
      env: {
        ...process.env,
        COOLIFY_URL: `http://127.0.0.1:${port}`,
        COOLIFY_TOKEN: 'fake',
        COOLIFY_VERIFY_SSL: 'false',
        COOLIFY_MCP_LOG: 'error',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    client = new McpStdioClient(child);

    const initResponse = await client.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'vitest', version: '1.0' },
    });
    expect(initResponse.result).toBeDefined();
    client.notify('notifications/initialized');
  }, 30000);

  afterAll(async () => {
    if (child) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 2000);
      });
    }
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
  });

  it(
    'all 6 manifest read tools pass MCP SDK schema validation (no -32602)',
    async () => {
      const toolCalls: Array<{
        name: string;
        arguments: Record<string, unknown>;
      }> = [
        { name: 'diagnose', arguments: { action: 'scan' } },
        {
          name: 'diagnose',
          arguments: { action: 'app', uuid: 'app-unhealthy' },
        },
        {
          name: 'diagnose',
          arguments: { action: 'server', uuid: 'srv-offline' },
        },
        { name: 'resource', arguments: { action: 'list' } },
        {
          name: 'system',
          arguments: { action: 'infrastructure_overview' },
        },
        { name: 'docs', arguments: { action: 'search', query: 'deploy' } },
      ];

      const responses: JsonRpcResponse[] = [];
      for (const call of toolCalls) {
        const response = await client.request('tools/call', {
          name: call.name,
          arguments: call.arguments,
        });
        responses.push(response);
      }

      let okTrueCount = 0;
      const outputJsonSchema = z.toJSONSchema(toolOutputSchema) as {
        properties?: Record<string, unknown>;
        additionalProperties?: boolean;
      };
      const allowedKeys = new Set(
        Object.keys(outputJsonSchema.properties ?? {}),
      );

      for (const response of responses) {
        const structured = response.result?.structuredContent;
        const rpcError = response.error;

        if (structured?.ok === true) {
          okTrueCount++;
          expect(rpcError).toBeUndefined();
          // Mirror Cursor client JSON Schema validation (additionalProperties: false)
          if (structured && typeof structured === 'object') {
            for (const key of Object.keys(structured)) {
              expect(allowedKeys.has(key)).toBe(true);
            }
            expect(structured).toHaveProperty('_meta');
          }
        } else if (rpcError) {
          expect(rpcError.code).not.toBe(-32602);
        } else if (structured?.error) {
          const code = structured.error.code;
          expect(String(code)).not.toBe('-32602');
        } else {
          throw new Error(
            `Unexpected response shape: ${JSON.stringify(response)}`,
          );
        }
      }

      expect(okTrueCount).toBeGreaterThanOrEqual(4);

      const appResponse = responses[1];
      const appData = appResponse.result?.structuredContent?.data;
      expect(appData?.uuid).toBe('app-unhealthy');
      expect(Array.isArray(appData?.hints)).toBe(true);

      const serverResponse = responses[2];
      const serverData = serverResponse.result?.structuredContent?.data;
      expect(typeof serverData?.validation_started).toBe('boolean');
      expect(serverData?.resources_counts).toMatchObject({
        applications: expect.any(Object),
        databases: expect.any(Object),
        services: expect.any(Object),
      });
    },
    30000,
  );
});
