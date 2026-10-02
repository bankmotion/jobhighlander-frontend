import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * A screenshot stored with an Ask AI question.
 *
 * Bytes, not JSON, so this cannot go through `proxy()`. The backend decides
 * who may read it, from the same profile check as the question log.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/job-queries/attachments/${encodeURIComponent(id)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Not available (${res.status})` }));
    return NextResponse.json(err, { status: res.status });
  }
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=604800, immutable',
    },
  });
}
