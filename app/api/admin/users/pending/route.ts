import { proxy } from '@/lib/proxy';

/** Accounts waiting for a role. Admin-level; the backend enforces it. */
export async function GET() {
  return proxy('/api/auth/users/pending');
}
