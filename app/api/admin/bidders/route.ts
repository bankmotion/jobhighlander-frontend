import { proxy } from '@/lib/proxy';

/** The signed-in admin's profiles with who each is shared with. */
export async function GET() {
  return proxy('/api/invitations/sent');
}
