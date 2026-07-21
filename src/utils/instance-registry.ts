import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  chmodSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
} from './errors.js';

export const instanceSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/),
  url: z.string().url(),
  token: z.string().min(1),
  type: z.enum(['self-hosted', 'cloud']),
  verifySsl: z.boolean().default(true),
});

export type Instance = z.infer<typeof instanceSchema>;

export interface Registry {
  default?: string;
  instances: Instance[];
}

function registryDir(): string {
  return process.env.COOLIFY_MCP_TEST_REGISTRY_DIR ?? join(homedir(), '.coolify-mcp');
}

function registryFilePath(): string {
  return join(registryDir(), 'instances.json');
}

function instanceNotFoundError(name: string): CoolifyApiError {
  return new CoolifyApiError({
    code: 'COOLIFY_INSTANCE_NOT_FOUND',
    message: `Instance '${name}' not found in registry`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_INSTANCE_NOT_FOUND,
  });
}

function partialEnvError(): CoolifyApiError {
  return new CoolifyApiError({
    code: 'COOLIFY_PARTIAL_ENV',
    message: 'Partial environment configuration: both COOLIFY_URL and COOLIFY_TOKEN must be set, or neither',
    recoveryHints: RECOVERY_HINTS.COOLIFY_PARTIAL_ENV,
  });
}

function noInstanceError(): CoolifyApiError {
  return new CoolifyApiError({
    code: 'COOLIFY_NO_INSTANCE',
    message: 'No Coolify instance configured',
    recoveryHints: RECOVERY_HINTS.COOLIFY_NO_INSTANCE,
  });
}

function redactInstance(instance: Instance, reveal?: boolean): Instance {
  if (reveal) {
    return { ...instance };
  }
  return { ...instance, token: '***' };
}

export class InstanceManager {
  private static writeLock: Promise<void> = Promise.resolve();

  private static withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
    const run = InstanceManager.writeLock.then(() => fn());
    InstanceManager.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  static loadRegistry(): Registry {
    const filePath = registryFilePath();
    if (!existsSync(filePath)) {
      return { instances: [] };
    }
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Registry;
      if (!parsed || !Array.isArray(parsed.instances)) {
        throw new CoolifyApiError({
          code: 'COOLIFY_VALIDATION_ERROR',
          message: `Registry file is invalid (missing instances array): ${filePath}`,
          recoveryHints: [
            'Inspect ~/.coolify-mcp/instances.json and fix JSON shape.',
            'Back up the file before re-running instance.add.',
          ],
        });
      }
      return parsed;
    } catch (error) {
      if (error instanceof CoolifyApiError) throw error;
      throw new CoolifyApiError({
        code: 'COOLIFY_VALIDATION_ERROR',
        message: `Failed to parse registry file: ${filePath}`,
        recoveryHints: [
          'Inspect ~/.coolify-mcp/instances.json for JSON syntax errors.',
          'Back up the file before rewriting via instance.add.',
        ],
      });
    }
  }

  private static executeSave(registry: Registry): void {
    const dir = registryDir();
    const filePath = registryFilePath();

    mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      chmodSync(dir, 0o700);
    } catch {
      /* Windows: NTFS ACLs */
    }

    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
      writeFileSync(tmpPath, JSON.stringify(registry, null, 2), { mode: 0o600 });
      try {
        chmodSync(tmpPath, 0o600);
      } catch {
        /* Windows */
      }
      renameSync(tmpPath, filePath);
      try {
        chmodSync(filePath, 0o600);
      } catch {
        /* Windows */
      }
    } catch (error) {
      try {
        if (existsSync(tmpPath)) {
          unlinkSync(tmpPath);
        }
      } catch {
        /* ignore cleanup failure */
      }
      throw error;
    }
  }

  static async saveRegistry(registry: Registry): Promise<void> {
    return InstanceManager.withWriteLock(() => {
      InstanceManager.executeSave(registry);
    });
  }

  static async add(input: unknown): Promise<Instance> {
    return InstanceManager.withWriteLock(async () => {
      const instance = instanceSchema.parse(input);
      const registry = InstanceManager.loadRegistry();

      if (registry.instances.some((entry) => entry.name === instance.name)) {
        throw new CoolifyApiError({
          code: 'COOLIFY_VALIDATION_ERROR',
          message: `Instance '${instance.name}' already exists`,
          recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
        });
      }

      registry.instances.push(instance);
      if (registry.instances.length === 1) {
        registry.default = instance.name;
      }

      InstanceManager.executeSave(registry);
      return instance;
    });
  }

  static async update(name: string, patch: Partial<Omit<Instance, 'name'>>): Promise<Instance> {
    return InstanceManager.withWriteLock(async () => {
      const registry = InstanceManager.loadRegistry();
      const index = registry.instances.findIndex((entry) => entry.name === name);
      if (index === -1) {
        throw instanceNotFoundError(name);
      }

      const current = registry.instances[index];
      const merged = instanceSchema.parse({ ...current, ...patch, name });
      registry.instances[index] = merged;
      InstanceManager.executeSave(registry);
      return merged;
    });
  }

  static async delete(
    name: string,
    options: { confirm: boolean; force?: boolean },
  ): Promise<void> {
    return InstanceManager.withWriteLock(async () => {
      if (!options.confirm) {
        throw new CoolifyApiError({
          code: 'COOLIFY_CONFIRM_REQUIRED',
          message: 'Delete requires confirm: true',
          recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
        });
      }

      const registry = InstanceManager.loadRegistry();
      const index = registry.instances.findIndex((entry) => entry.name === name);
      if (index === -1) {
        throw instanceNotFoundError(name);
      }

      const isDefault = registry.default === name;
      const isLast = registry.instances.length === 1;
      if ((isDefault || isLast) && !options.force) {
        throw new CoolifyApiError({
          code: 'COOLIFY_VALIDATION_ERROR',
          message: isLast
            ? `Cannot delete the last remaining instance '${name}' without force: true`
            : `Cannot delete default instance '${name}' without force: true`,
          recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
        });
      }

      registry.instances.splice(index, 1);
      if (registry.default === name) {
        registry.default = registry.instances[0]?.name;
      }

      InstanceManager.executeSave(registry);
    });
  }

  static async setDefault(name: string): Promise<void> {
    return InstanceManager.withWriteLock(async () => {
      const registry = InstanceManager.loadRegistry();
      const exists = registry.instances.some((entry) => entry.name === name);
      if (!exists) {
        throw instanceNotFoundError(name);
      }
      if (registry.default === name) {
        return;
      }
      registry.default = name;
      InstanceManager.executeSave(registry);
    });
  }

  static list(options?: { reveal?: boolean }): Instance[] {
    const registry = InstanceManager.loadRegistry();
    return registry.instances.map((entry) => redactInstance(entry, options?.reveal));
  }

  static get(name: string, options?: { reveal?: boolean }): Instance {
    const registry = InstanceManager.loadRegistry();
    const entry = registry.instances.find((instance) => instance.name === name);
    if (!entry) {
      throw instanceNotFoundError(name);
    }
    return redactInstance(entry, options?.reveal);
  }

  static resolveCredentials(
    instanceParam?: string,
    env?: { COOLIFY_URL?: string; COOLIFY_TOKEN?: string; COOLIFY_VERIFY_SSL?: string },
  ): { url: string; token: string; verifySsl: boolean } {
    if (instanceParam) {
      const registry = InstanceManager.loadRegistry();
      const entry = registry.instances.find((instance) => instance.name === instanceParam);
      if (!entry) {
        throw instanceNotFoundError(instanceParam);
      }
      return {
        url: entry.url,
        token: entry.token,
        verifySsl: entry.verifySsl,
      };
    }

    const envUrl = env?.COOLIFY_URL?.trim();
    const envToken = env?.COOLIFY_TOKEN?.trim();
    const hasUrl = Boolean(envUrl);
    const hasToken = Boolean(envToken);

    if (hasUrl && hasToken) {
      return {
        url: envUrl!,
        token: envToken!,
        verifySsl: env?.COOLIFY_VERIFY_SSL !== 'false',
      };
    }

    if (hasUrl || hasToken) {
      throw partialEnvError();
    }

    const registry = InstanceManager.loadRegistry();
    if (registry.default) {
      const entry = registry.instances.find((instance) => instance.name === registry.default);
      if (entry) {
        return {
          url: entry.url,
          token: entry.token,
          verifySsl: entry.verifySsl,
        };
      }
      if (registry.instances.length > 0) {
        throw new CoolifyApiError({
          code: 'COOLIFY_VALIDATION_ERROR',
          message: `Registry default '${registry.default}' does not match any registered instance`,
          recoveryHints: [
            'Run instance.set-default with a valid instance name from instance.list.',
            'Or fix registry.default in ~/.coolify-mcp/instances.json to an existing name.',
          ],
        });
      }
    }

    throw noInstanceError();
  }
}
