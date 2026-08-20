import { proxy } from '@/lib/proxy';

/** Invitations addressed to the signed-in user. */
export async function GET() {
  return proxy('/api/invitations');
}
