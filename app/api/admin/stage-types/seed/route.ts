import { proxy } from '@/lib/proxy';

/** Restore any missing default badge. Never overwrites an existing one. */
export async function POST() {
  return proxy('/api/stage-types/seed', { method: 'POST' });
}
