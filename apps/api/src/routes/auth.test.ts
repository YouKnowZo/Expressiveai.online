import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticatedClerkId } from '../auth';

describe('Clerk API authentication', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CLERK_ISSUER;
    delete process.env.CLERK_JWKS_URL;
  });

  it('rejects requests without a bearer token', async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const userId = await authenticatedClerkId({ headers: {} }, { status } as never);

    expect(userId).toBeNull();
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Sign in to continue.' });
  });

  it('verifies Clerk JWT signature and expected issuer before trusting subject', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const issuer = 'https://clerk.example.test';
    process.env.CLERK_ISSUER = issuer;
    process.env.CLERK_JWKS_URL = 'https://clerk.example.test/.well-known/jwks.json';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: 'key-1', kty: 'RSA' }] }),
    }));

    const token = jwt.sign({ sub: 'user_123', iss: issuer }, privateKey, {
      algorithm: 'RS256',
      keyid: 'key-1',
    });
    const status = vi.fn();
    const userId = await authenticatedClerkId(
      { headers: { authorization: `Bearer ${token}` } },
      { status } as never,
    );

    expect(userId).toBe('user_123');
    expect(status).not.toHaveBeenCalled();
  });

  it('rejects tokens signed by an untrusted key', async () => {
    const trusted = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = trusted.publicKey.export({ format: 'jwk' });
    const issuer = 'https://clerk.example.test';
    process.env.CLERK_ISSUER = issuer;
    process.env.CLERK_JWKS_URL = 'https://clerk.example.test/.well-known/jwks.json';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: 'trusted', kty: 'RSA' }] }),
    }));

    const token = jwt.sign({ sub: 'user_evil', iss: issuer }, attacker.privateKey, {
      algorithm: 'RS256',
      keyid: 'trusted',
    });
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const userId = await authenticatedClerkId(
      { headers: { authorization: `Bearer ${token}` } },
      { status } as never,
    );

    expect(userId).toBeNull();
    expect(status).toHaveBeenCalledWith(401);
  });
});
