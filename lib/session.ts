import { jwtVerify } from 'jose';

export type Role = 'super_admin' | 'admin' | 'bidder' | 'guest';

export interface Session {
  sub: number;
  email: string;
  role: Role;
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.email !== 'string' || typeof payload.role !== 'string') return null;
    return { sub: Number(payload.sub), email: payload.email, role: payload.role as Role };
  } catch {
    return null;
  }
}

export const isAdminRole = (role?: Role): boolean => role === 'admin' || role === 'super_admin';
export const isSuperAdmin = (role?: Role): boolean => role === 'super_admin';
