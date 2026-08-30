import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/resumes/pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(parsed.body),
    cache: 'no-store',
  });

  // Errors come back as JSON; pass them through unchanged so the UI can show
  // the real message rather than a broken download.
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `PDF render failed (${res.status})` }));
    return NextResponse.json(err, { status: res.status });
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': res.headers.get('content-disposition') ?? 'attachment; filename="resume.pdf"',
    },
  });
}
