import { cookies } from 'next/headers';
import { verifyToken, type Session } from './session';

export const TOKEN_COOKIE = 'token';

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<Session | null> {
  const token = await getToken();
  return token ? verifyToken(token) : null;
}
