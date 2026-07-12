import { z } from 'zod';

const envSchema = z.object({
  COOLIFY_URL: z.string().url(),
  COOLIFY_TOKEN: z.string().min(1),
  COOLIFY_VERIFY_SSL: z
    .preprocess((val) => val !== 'false', z.boolean())
    .default(true),
  COOLIFY_MCP_LOG: z.enum(['debug', 'info', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): EnvConfig {
  return envSchema.parse(source);
}
