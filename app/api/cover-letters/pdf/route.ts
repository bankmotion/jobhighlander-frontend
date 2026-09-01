import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/cover-letters/pdf?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  // 204 means the job simply has no letter. It has no body, and passing it
  // through unchanged is what lets the caller tell "nothing written yet" apart
  // from a route that is not wired up.
  if (res.status === 204) return new NextResponse(null, { status: 204 });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Cover letter render failed (${res.status})` }));
    return NextResponse.json(err, { status: res.status });
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        res.headers.get('content-disposition') ?? 'attachment; filename="cover.pdf"',
    },
  });
}
