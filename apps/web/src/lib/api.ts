/**
 * Base URL for the Express API (no trailing slash).
 * Production builds require NEXT_PUBLIC_API_URL to be set explicitly.
 */
export function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (process.env.NODE_ENV === 'production' && (!configured || configured.trim() === '')) {
    throw new Error(
      'NEXT_PUBLIC_API_URL is required in production. Set it in the deployment environment or apps/web/.env.example.',
    );
  }

  return (configured || 'http://localhost:3001').replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${p}`;
}

export async function authenticatedApiFetch(
  path: string,
  getToken: () => Promise<string | null>,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(apiUrl(path), { ...init, headers });
}
