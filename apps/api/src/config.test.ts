import { describe, expect, it } from 'vitest';
import { validateRuntimeEnv } from './config';

describe('validateRuntimeEnv', () => {
  it('accepts a valid production config', () => {
    const env = {
      NODE_ENV: 'production',
      PORT: '3001',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      FRONTEND_URL: 'https://example.com',
      REDIS_URL: 'redis://localhost:6379',
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123',
      CLERK_WEBHOOK_SECRET: 'whsec_clerk_123',
      CLERK_ISSUER: 'https://example.clerk.accounts.dev',
      CLERK_JWKS_URL: 'https://example.clerk.accounts.dev/.well-known/jwks.json',
      HF_TOKEN: 'hf_123',
      STORAGE_BUCKET: 'videos',
    };

    expect(() => validateRuntimeEnv(env, true)).not.toThrow();
  });

  it('rejects missing required values in production', () => {
    expect(() =>
      validateRuntimeEnv(
        {
          NODE_ENV: 'production',
          PORT: '3001',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: '',
          FRONTEND_URL: 'https://example.com',
        },
        true,
      ),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
