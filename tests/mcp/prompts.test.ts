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

  it('incident prompt mentions diagnose, logs, restart, and emergency redeploy', async () => {
    const server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerCoolifyPrompts(server);
    const result = await getRegisteredPrompts(server).incident.handler({
      uuid: 'app-123',
      project_uuid: 'proj-1',
    });
    const content = assistantContent(result);
    expect(content).toContain('diagnose({ action: "app"');
    expect(content).toContain('application({ action: "logs"');
    expect(content).toContain('application({ action: "restart"');
    expect(content).toContain('emergency({ action: "redeploy_project"');
  });
});
