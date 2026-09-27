import { createPublicKey, JsonWebKey } from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface ClerkJwk {
  kid: string;
  kty: string;
  [key: string]: unknown;
}

const jwksCache = new Map<string, { keys: ClerkJwk[]; expiresAt: number }>();
const jwksRequests = new Map<string, Promise<ClerkJwk[]>>();

async function getJwks(jwksUrl: string): Promise<ClerkJwk[]> {
  const cached = jwksCache.get(jwksUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  let request = jwksRequests.get(jwksUrl);
  if (!request) {
    request = fetch(jwksUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Clerk JWKS returned HTTP ${response.status}`);
        const body = await response.json() as { keys?: ClerkJwk[] };
        if (!Array.isArray(body.keys) || !body.keys.length) throw new Error('Clerk JWKS contains no keys');
        jwksCache.set(jwksUrl, { keys: body.keys, expiresAt: Date.now() + 10 * 60 * 1000 });
        return body.keys;
      })
      .finally(() => jwksRequests.delete(jwksUrl));
    jwksRequests.set(jwksUrl, request);
  }
  return request;
}

async function verifyClerkToken(token: string): Promise<JwtPayload> {
  const jwksUrl = process.env.CLERK_JWKS_URL;
  const issuer = process.env.CLERK_ISSUER;
  if (!jwksUrl || !issuer) throw new Error('Clerk API token verification is not configured');

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
    throw new Error('Invalid Clerk session token');
  }

  let keys = await getJwks(jwksUrl);
  let jwk = keys.find((key) => key.kid === decoded.header.kid);
  if (!jwk) {
    jwksCache.delete(jwksUrl);
    keys = await getJwks(jwksUrl);
    jwk = keys.find((key) => key.kid === decoded.header.kid);
  }
  if (!jwk || jwk.kty !== 'RSA') throw new Error('Unknown Clerk signing key');

  const publicKey = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
  const verified = jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer });
  if (typeof verified === 'string' || !verified.sub) throw new Error('Clerk token has no user identity');
  return verified;
}

export async function authenticatedClerkId(
  req: { headers: { authorization?: string } },
  res: { status: (code: number) => { json: (payload: unknown) => unknown } },
): Promise<string | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return null;
  }

  try {
    const claims = await verifyClerkToken(authorization.slice('Bearer '.length).trim());
    return claims.sub!;
  } catch (error) {
    if (error instanceof Error && error.message === 'Clerk API token verification is not configured') {
      res.status(503).json({ error: 'Authentication is not configured on this API.' });
      return null;
    }
    console.error('[auth] Could not validate Clerk token:', error);
    res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    return null;
  }
}
