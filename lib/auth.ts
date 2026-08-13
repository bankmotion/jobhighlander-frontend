import { cookies } from 'next/headers';
import { verifyToken, type Session } from './session';

export const TOKEN_COOKIE = 'token';

/** Raw JWT from the cookie (server-side). */
export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

/** Verified session for the current request, or null. */
export async function getSession(): Promise<Session | null> {
  const token = await getToken();
  return token ? verifyToken(token) : null;
}
