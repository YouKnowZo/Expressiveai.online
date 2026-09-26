export type RuntimeEnv = Record<string, string | undefined>;

export const requiredProductionEnvVars = [
  'REDIS_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'HF_TOKEN',
  'STORAGE_BUCKET',
] as const;

export function validateRuntimeEnv(
  env: RuntimeEnv = process.env,
  isProduction = process.env.NODE_ENV === 'production',
): RuntimeEnv {
  if (!isProduction) {
    return env;
  }

  const missing = requiredProductionEnvVars.filter((key) => {
    const value = env[key];
    return !value || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required production env vars for worker: ${missing.join(', ')}. ` +
        'Set these values in your deployment environment or copy the template from apps/worker/.env.example before starting the worker.',
    );
  }

  return env;
}
