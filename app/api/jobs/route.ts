import { proxy } from '@/lib/proxy';
import { displayZone } from '@/lib/zone.server';

/**
 * Add a job by hand.
 *
 * The body is forwarded as-is — the backend validates it, and duplicating the
 * schema here would give two places to keep in step and one of them would drift.
 * Only `tz` is added, because the browser cannot be trusted to send it and the
 * cookie is right here.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return proxy('/api/jobs', {
    method: 'POST',
    body: { ...body, tz: await displayZone() },
  });
}
