import * as z from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/server';

const optionalInstance = z
  .string()
  .optional()
  .describe('Coolify instance name (optional)');

function manifestSoftNote(hasUuid: boolean): string {
  if (hasUuid) return '';
  return '\nNote: If a UUID is not provided, resolve the target from `.coolify/manifest.json` or ask the user — do not fail on a missing manifest.';
}

function optionalInstanceSuffix(instance?: string): string {
  return instance ? `, instance: "${instance}"` : '';
}

export function registerCoolifyPrompts(server: McpServer): void {
  server.registerPrompt(
    'deploy',
    {
      title: 'Deploy Application',
      description:
        'Deploy an application on Coolify and monitor until terminal status.',
      argsSchema: z.object({
        instance: optionalInstance,
        uuid: z.string().optional().describe('Target application UUID'),
        force: z
          .string()
          .optional()
          .describe('Force deployment without cache (true/false)'),
      }),
    },
    async ({ instance, uuid, force }) => {
      const parsedForce = force === 'true';
      const instanceSuffix = optionalInstanceSuffix(instance);
      const uuidValue = uuid ?? '<uuid>';
      return {
        messages: [
          {
            role: 'user',
            content: `Guide me through deploying ${uuid ? `application ${uuid}` : 'an application'}${instance ? ` on instance ${instance}` : ''}.${parsedForce ? ' Use force deploy.' : ''}`,
          },
          {
            role: 'assistant',
            content: `Deploy application workflow:

1. Resolve the target application UUID${uuid ? ` (${uuid})` : ''} from args, \`.coolify/manifest.json\`, or ask the user.${manifestSoftNote(Boolean(uuid))}

2. Trigger deployment via \`application.deploy\`:
   application({ action: "deploy", uuid: "${uuidValue}", force: ${parsedForce}, wait: false${instanceSuffix} })

3. Capture the returned \`deployment_uuid\` from the response.

4. Poll deployment progress with \`deployment.get\` until status is terminal (\`finished\` or \`failed\`):
   deployment({ action: "get", deployment_uuid: "<deployment_uuid>"${instanceSuffix} })
   Future (Phase 21): \`deployment.watch\` will replace polling — do not call watch until it exists.

5. Report the final deployment status and any relevant logs hint to the user.`,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'diagnose',
    {
      title: 'Diagnose Issue',
      description:
        'Investigate application, server, or fleet-wide issues with diagnose actions.',
      argsSchema: z.object({
        instance: optionalInstance,
        uuid: z.string().optional().describe('Target resource UUID'),
      }),
    },
    async ({ instance, uuid }) => {
      const instanceSuffix = optionalInstanceSuffix(instance);
      return {
        messages: [
          {
            role: 'user',
            content: `Help me diagnose ${uuid ? `resource ${uuid}` : 'a Coolify issue'}${instance ? ` on instance ${instance}` : ''}.`,
          },
          {
            role: 'assistant',
            content: `Diagnose workflow:

1. Resolve the target UUID${uuid ? ` (${uuid})` : ''} from args, \`.coolify/manifest.json\`, or ask the user.${manifestSoftNote(Boolean(uuid))}

2. Application path — call \`diagnose\` with action \`app\`:
   diagnose({ action: "app", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })

3. Server path — call \`diagnose\` with action \`server\`:
   diagnose({ action: "server", uuid: "${uuid ?? '<server-uuid>'}"${instanceSuffix} })

4. Fleet scan path — call \`diagnose\` with action \`scan\`:
   diagnose({ action: "scan"${instanceSuffix} })

5. Summarize findings by severity and recommend the next remediation step.`,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'new-project',
    {
      title: 'New Coolify Project',
      description:
        'Create a project, environment, and optional server linkage for new infrastructure.',
      argsSchema: z.object({
        instance: optionalInstance,
        name: z.string().optional().describe('Project name'),
        server_uuid: z.string().optional().describe('Server UUID to link'),
      }),
    },
    async ({ instance, name, server_uuid }) => {
      const instanceSuffix = optionalInstanceSuffix(instance);
      const projectName = name ?? '<project-name>';
      return {
        messages: [
          {
            role: 'user',
            content: `Guide me through setting up ${name ? `project "${name}"` : 'a new Coolify project'}${server_uuid ? ` on server ${server_uuid}` : ''}.`,
          },
          {
            role: 'assistant',
            content: `New project workflow:

1. Ask the user for project name and initial environment name if not provided (e.g. production vs staging).${manifestSoftNote(Boolean(name))}

2. Create the project with an initial environment via \`project\`:
   project({ action: "create", name: "${projectName}", initial_environment: "<env-name>"${instanceSuffix} })

3. Optionally create an additional environment via \`environment\`:
   environment({ action: "create", project_uuid: "<project-uuid>", name: "<env-name>"${instanceSuffix} })

4. Link a server if needed — verify server UUID via \`resource\` list/find or \`server\` get:
   server({ action: "get", uuid: "${server_uuid ?? '<server-uuid>'}"${instanceSuffix} })

5. Soft manifest guidance — after creating an app/service/database, upsert that resource (not the project) via \`manifest\`:
   manifest({ action: "upsert", resource: { uuid: "<resource-uuid>", type: "application", name: "<name>" }, project_uuid: "<project-uuid>", environment_uuid: "<env-uuid>"${instanceSuffix} })
   Or preview a full reconcile with \`manifest({ action: "sync", dry_run: true${instanceSuffix} })\`.
   Do not execute setup recipes in this prompt — CRUD only.

6. Confirm project, environment, and server linkage with the user.`,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'incident',
    {
      title: 'Incident Response',
      description:
        'Triage an incident with diagnose, logs, restart, or emergency redeploy steps.',
      argsSchema: z.object({
        instance: optionalInstance,
        uuid: z.string().optional().describe('Affected application UUID'),
        project_uuid: z
          .string()
          .optional()
          .describe('Project UUID for emergency redeploy'),
      }),
    },
    async ({ instance, uuid, project_uuid }) => {
      const instanceSuffix = optionalInstanceSuffix(instance);
      return {
        messages: [
          {
            role: 'user',
            content: `Help me respond to an incident${uuid ? ` on application ${uuid}` : ''}${project_uuid ? ` in project ${project_uuid}` : ''}.`,
          },
          {
            role: 'assistant',
            content: `Incident response workflow:

1. Resolve application UUID${uuid ? ` (${uuid})` : ''} from args, \`.coolify/manifest.json\`, or ask the user.${manifestSoftNote(Boolean(uuid))}

2. Triage with \`diagnose\` — start with action \`app\`:
   diagnose({ action: "app", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })

3. Pull recent logs via \`application.logs\`:
   application({ action: "logs", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })

4. Attempt non-destructive recovery — \`application\` restart:
   application({ action: "restart", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })

5. If restart is insufficient, ask the human before destructive actions. Preview then confirm emergency redeploy:
   emergency({ action: "redeploy_project", project_uuid: "${project_uuid ?? '<project-uuid>'}", confirm: false${instanceSuffix} })
   Retry with \`confirm: true\` only after explicit human approval.

6. Report incident status, actions taken, and recommended follow-up.`,
          },
        ],
      };
    },
  );
}
