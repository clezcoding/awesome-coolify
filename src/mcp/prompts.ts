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

2. Trigger deployment and capture \`deployment_uuid\` via \`application.deploy\` with \`wait: false\`:
   application({ action: "deploy", uuid: "${uuidValue}", force: ${parsedForce}, wait: false${instanceSuffix} })

3. Monitor until terminal with \`deployment.watch\` (timeout optional, default 300s):
   deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300${instanceSuffix} })

4. On watch timeout error: re-call \`deployment.watch\` with the same \`deployment_uuid\` (raise \`timeout\` if builds are slow). On \`failed\` or \`cancelled-by-user\`: fetch build logs via \`deployment.logs\` (\`deployment_uuid\` or \`application_uuid\`) and surface them to the user — do not treat as success.

Note: \`application.deploy wait:true\` is legacy back-compat; prefer \`deployment.watch\` for bounded polling with backoff. Phase 22 IDE skill packs must document watch timeout/recovery per SKILL-02.`,
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
   For app triage + bounded log tail in one call, prefer \`diagnose.logs\` with \`mode: "full"\`.

3. Server path — call \`diagnose\` with action \`server\`:
   diagnose({ action: "server", uuid: "${uuid ?? '<server-uuid>'}"${instanceSuffix} })

4. Fleet scan path — call \`diagnose\` with action \`scan\`:
   diagnose({ action: "scan"${instanceSuffix} })

5. For bounded log-pattern triage, call \`diagnose.analyze\` (or use the \`incident\` / \`rollback\` playbooks when remediation is next):
   diagnose({ action: "analyze", uuid: "${uuid ?? '<uuid>'}"${instanceSuffix} })

6. Summarize findings by severity and recommend the next remediation step.`,
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
        'Triage an incident with diagnose.analyze, logs, restart, or emergency redeploy steps.',
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
      const uuidValue = uuid ?? '<uuid>';
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

2. Pattern triage — \`diagnose.analyze\` for matched log patterns + next-action hints:
   diagnose({ action: "analyze", uuid: "${uuidValue}"${instanceSuffix} })

3. Triage + logs in one call — \`diagnose.logs\` with \`mode: "full"\`:
   diagnose({ action: "logs", mode: "full", uuid: "${uuidValue}"${instanceSuffix} })
   Check \`capabilities.diagnose_logs\` via \`system({ action: "version" })\` when unsure.

4. If a live symptom persists, follow runtime logs (check \`capabilities.application_logs_follow\`):
   application({ action: "logs", uuid: "${uuidValue}", follow: true${instanceSuffix} })

5. On build/deploy suspicion or after failed \`deployment.watch\`, fetch build logs:
   deployment({ action: "logs", deployment_uuid: "<deployment-uuid>"${instanceSuffix} })
   App-only: do not attempt service/DB log tools — unavailable on Coolify 4.1.2.
   When deploy or rollback is under consideration, run advisory preflight first:
   deployment({ action: "preflight", uuid: "${uuidValue}"${instanceSuffix} })
   On \`crash_loop\` or failed deploy patterns, switch to the \`rollback\` playbook prompt — do not auto-set confirm true.

6. Attempt non-destructive recovery — \`application\` restart:
   application({ action: "restart", uuid: "${uuidValue}"${instanceSuffix} })

7. If restart is insufficient, ask the human before destructive actions. Preview then confirm emergency redeploy:
   emergency({ action: "redeploy_project", project_uuid: "${project_uuid ?? '<project-uuid>'}", confirm: false${instanceSuffix} })
   Retry with \`confirm: true\` only after explicit human approval. Never auto-set confirm true from analyze/recommend/playbooks.

8. Report incident status, actions taken, and recommended follow-up.`,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'rollback',
    {
      title: 'Rollback Application',
      description:
        'Safely preview then confirm a Coolify application rollback via deployment tools.',
      argsSchema: z.object({
        instance: optionalInstance,
        uuid: z.string().optional().describe('Target application UUID'),
        name: z.string().optional().describe('Application name to resolve'),
        fqdn: z.string().optional().describe('Application FQDN to resolve'),
      }),
    },
    async ({ instance, uuid, name, fqdn }) => {
      const instanceSuffix = optionalInstanceSuffix(instance);
      const uuidValue = uuid ?? '<uuid>';
      const resolveHints = [
        uuid ? `uuid ${uuid}` : null,
        name ? `name "${name}"` : null,
        fqdn ? `fqdn ${fqdn}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      return {
        messages: [
          {
            role: 'user',
            content: `Guide me through rolling back ${resolveHints || 'an application'}${instance ? ` on instance ${instance}` : ''}.`,
          },
          {
            role: 'assistant',
            content: `Rollback workflow (composes existing deployment atomic tools only — guidance text, not an auto-executing runner):

1. Resolve application UUID${uuid ? ` (${uuid})` : ''} from args (\`uuid\` / \`name\` / \`fqdn\`), \`.coolify/manifest.json\`, or ask the user.${manifestSoftNote(Boolean(uuid))}

2. Advisory risk check — \`deployment.preflight\` before any rollback mutation:
   deployment({ action: "preflight", uuid: "${uuidValue}"${instanceSuffix} })

3. Preview rollback target (no mutation) — \`deployment.rollback\` with \`confirm: false\`:
   deployment({ action: "rollback", uuid: "${uuidValue}", confirm: false${instanceSuffix} })
   Surface \`rollback_target\` / preview data to the human. Do not skip this tool-level confirm gate.

4. STOP — human approval required (SAF-01). Do not proceed to \`confirm: true\` until the human explicitly approves the previewed rollback. Analyze/recommend/playbooks never auto-set confirm true.

5. After explicit human approval only, mutate with \`confirm: true\` (optional \`wait: true\` then \`deployment.watch\`):
   deployment({ action: "rollback", uuid: "${uuidValue}", confirm: true${instanceSuffix} })
   deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300${instanceSuffix} })

6. On \`COOLIFY_ROLLBACK_UNAVAILABLE\` — explain no finished prior deployment / git-only path; do not invent a second rollback client. Offer \`deployment.list\` / redeploy alternatives after human agreement.

7. Report rollback outcome and next monitoring steps.`,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'maintenance-window',
    {
      title: 'Maintenance Window',
      description:
        'Stop a resource, perform maintenance work, then start/restart with confirm gates.',
      argsSchema: z.object({
        instance: optionalInstance,
        resource_type: z
          .enum(['application', 'service', 'database'])
          .describe('Resource kind to maintain (required — no silent default)'),
        uuid: z.string().optional().describe('Target resource UUID'),
        name: z.string().optional().describe('Resource name to resolve'),
      }),
    },
    async ({ instance, resource_type, uuid, name }) => {
      const instanceSuffix = optionalInstanceSuffix(instance);
      const uuidValue = uuid ?? '<uuid>';
      const tool = resource_type;
      return {
        messages: [
          {
            role: 'user',
            content: `Guide me through a maintenance window for ${resource_type}${uuid ? ` ${uuid}` : name ? ` "${name}"` : ''}${instance ? ` on instance ${instance}` : ''}.`,
          },
          {
            role: 'assistant',
            content: `Maintenance-window workflow (single-instance scope — no cross-instance fan-out):

1. Confirm maintenance scope with the human: resource_type \`${resource_type}\`, UUID${uuid ? ` (${uuid})` : name ? ` / name "${name}"` : ''}, and optional instance. Ask if UUID is missing.${manifestSoftNote(Boolean(uuid))}

2. If a deploy is planned during the window, run advisory preflight first:
   deployment({ action: "preflight", uuid: "${uuidValue}"${instanceSuffix} })

3. Stop the resource via the matching lifecycle tool:
   ${tool}({ action: "stop", uuid: "${uuidValue}"${instanceSuffix} })
   Use \`application\` | \`service\` | \`database\` matching \`resource_type\` — never invent a parallel client.

4. Work phase (agent-guided): env updates, \`manifest({ action: "audit"${instanceSuffix} })\`, \`recipe({ action: "recommend", ... })\`, patches — keep mutations on existing confirm-gated actions.

5. Bring the resource back — \`start\` or \`restart\`:
   ${tool}({ action: "start", uuid: "${uuidValue}"${instanceSuffix} })
   ${tool}({ action: "restart", uuid: "${uuidValue}"${instanceSuffix} })
   Optional application redeploy with watch:
   application({ action: "deploy", uuid: "${uuidValue}", wait: false${instanceSuffix} })
   deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300${instanceSuffix} })

6. Destructive deletes / emergency ops — never without existing confirm gates. Preview with \`confirm: false\`, then \`confirm: true\` only after explicit human approval. Playbooks never auto-set confirm true.

7. Report window outcome, resource status, and follow-up.`,
          },
        ],
      };
    },
  );
}
