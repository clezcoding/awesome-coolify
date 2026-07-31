import { describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/server';
import { registerCoolifyPrompts } from '../../src/mcp/prompts.js';

type RegisteredPrompt = {
  handler: (args: Record<string, string | undefined>) => Promise<{
    messages: Array<{ role: string; content: string }>;
  }>;
};

function getRegisteredPrompts(
  server: McpServer,
): Record<string, RegisteredPrompt> {
  return (
    server as McpServer & {
      _registeredPrompts: Record<string, RegisteredPrompt>;
    }
  )._registeredPrompts;
}

function assistantContent(
  result: Awaited<ReturnType<RegisteredPrompt['handler']>>,
): string {
  const assistant = result.messages.find((m) => m.role === 'assistant');
  return assistant?.content ?? '';
}

describe('MCP prompts registration', () => {
  it('registers exactly deploy, diagnose, new-project, and incident prompts', () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const names = Object.keys(getRegisteredPrompts(server)).sort();
    expect(names).toEqual(['deploy', 'diagnose', 'incident', 'new-project']);
  });

  it('each prompt returns messages without throwing when called with no args', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const prompts = getRegisteredPrompts(server);

    for (const name of ['deploy', 'diagnose', 'new-project', 'incident']) {
      const result = await prompts[name].handler({});
      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      expect(assistantContent(result).length).toBeGreaterThan(0);
    }
  });

  it('deploy prompt recommends watch-primary flow with timeout re-watch and wait:true legacy', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const result = await getRegisteredPrompts(server).deploy.handler({
      uuid: 'app-123',
      force: 'true',
    });
    const content = assistantContent(result);

    expect(content).toContain('application.deploy');
    expect(content).toContain('deployment.watch');
    expect(content).toContain('deployment.logs');
    expect(content).toMatch(/timeout|re-watch|re-call|watch again/i);
    expect(content).toMatch(/failed|cancelled|clear error|do not treat as success/i);
    expect(content).toMatch(/legacy|wait:\s*true|wait:true/i);

    expect(content).not.toMatch(/Future \(Phase 21\)/i);
    expect(content).not.toMatch(/do not call watch until/i);

    const watchIndex = content.indexOf('deployment.watch');
    const getIndex = content.indexOf('deployment.get');
    if (getIndex >= 0) {
      expect(watchIndex).toBeLessThan(getIndex);
    }
  });

  it('diagnose prompt mentions app, server, and scan paths', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const result = await getRegisteredPrompts(server).diagnose.handler({
      uuid: 'app-123',
    });
    const content = assistantContent(result);
    expect(content).toContain('action: "app"');
    expect(content).toContain('action: "server"');
    expect(content).toContain('action: "scan"');
  });

  it('new-project prompt mentions project, environment, and manifest guidance', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const result = await getRegisteredPrompts(server)['new-project'].handler({
      name: 'demo',
      server_uuid: 'srv-1',
    });
    const content = assistantContent(result);
    expect(content).toContain('project({ action: "create"');
    expect(content).toContain('environment({ action: "create"');
    expect(content).toContain('manifest({ action: "upsert"');
    expect(content).toContain('resource:');
    expect(content).toContain('project_uuid:');
    expect(content).toContain('environment_uuid:');
    expect(content).not.toContain('resources:');
    expect(content).not.toContain('type: "project"');
  });

  it('incident prompt mentions diagnose.logs, deployment.logs, follow, and app-only guardrail', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const result = await getRegisteredPrompts(server).incident.handler({
      uuid: 'app-123',
      project_uuid: 'proj-1',
    });
    const content = assistantContent(result);

    expect(content).toContain('diagnose({ action: "logs"');
    expect(content).toContain('mode: "full"');
    expect(content).toContain('deployment({ action: "logs"');
    expect(content).toMatch(/follow:\s*true/);
    expect(content).toMatch(/application_logs_follow/);
    expect(content).toMatch(/service|database|DB/i);
    expect(content).toContain('application({ action: "restart"');
    expect(content).toContain('emergency({ action: "redeploy_project"');
    expect(content).not.toMatch(
      /diagnose\(\{ action: "app".*application\(\{ action: "logs"/s,
    );
  });
});

/**
 * Wave 0 Nyquist RED scaffolds for Phase 31 playbook prompts (PLAY-01/02, D-08..D-10).
 * Plan 31-02 flips it.fails → it when rollback + maintenance-window ship and incident upgrades.
 */
describe('MCP prompts Phase 31 playbooks (RED)', () => {
  it.fails(
    'registers exactly six prompts including rollback and maintenance-window (PLAY-01, D-08)',
    () => {
      const server = new McpServer({ name: 'test-server', version: '1.0.0' });
      registerCoolifyPrompts(server);
      const names = Object.keys(getRegisteredPrompts(server)).sort();
      expect(names).toEqual([
        'deploy',
        'diagnose',
        'incident',
        'maintenance-window',
        'new-project',
        'rollback',
      ]);
    },
  );

  it.fails(
    'rollback cites preflight, rollback confirm gate, and COOLIFY_ROLLBACK_UNAVAILABLE (D-09, PLAY-02)',
    async () => {
      const server = new McpServer({ name: 'test-server', version: '1.0.0' });
      registerCoolifyPrompts(server);
      const prompts = getRegisteredPrompts(server);
      expect(prompts.rollback).toBeDefined();
      const result = await prompts.rollback.handler({ uuid: 'app-123' });
      const content = assistantContent(result);

      expect(content).toMatch(/deployment\(\{\s*action:\s*"preflight"/);
      expect(content).toMatch(/deployment\(\{\s*action:\s*"rollback"/);
      expect(content).toMatch(/confirm:\s*false/);
      expect(content).toMatch(/confirm:\s*true/);
      expect(content).toMatch(/human approval|approval required|STOP/i);
      expect(content).toContain('COOLIFY_ROLLBACK_UNAVAILABLE');
      expect(content).not.toMatch(/\bofetch\b|\baxios\b|\bfetch\(/i);
    },
  );

  it.fails(
    'maintenance-window cites stop then start/restart with confirm language (D-10)',
    async () => {
      const server = new McpServer({ name: 'test-server', version: '1.0.0' });
      registerCoolifyPrompts(server);
      const prompts = getRegisteredPrompts(server);
      expect(prompts['maintenance-window']).toBeDefined();
      const result = await prompts['maintenance-window'].handler({
        resource_type: 'application',
        uuid: 'app-123',
      });
      const content = assistantContent(result);

      expect(content).toMatch(/action:\s*"stop"/);
      expect(content).toMatch(/action:\s*"(start|restart)"/);
      expect(content).toMatch(/application|service|database/);
      expect(content).toMatch(/confirm/i);
      expect(content).not.toMatch(/\bofetch\b|\baxios\b|\bfetch\(/i);
    },
  );

  it.fails(
    'upgraded incident cites diagnose.analyze and deployment.preflight (D-08)',
    async () => {
      const server = new McpServer({ name: 'test-server', version: '1.0.0' });
      registerCoolifyPrompts(server);
      const result = await getRegisteredPrompts(server).incident.handler({
        uuid: 'app-123',
      });
      const content = assistantContent(result);

      expect(content).toMatch(/diagnose\(\{\s*action:\s*"analyze"/);
      expect(content).toMatch(/deployment\(\{\s*action:\s*"preflight"/);
      expect(content).not.toMatch(/\bofetch\b|\baxios\b|\bfetch\(/i);
    },
  );
});
