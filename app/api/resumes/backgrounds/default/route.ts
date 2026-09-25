import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Save a profile's default resume background. Mirrors templates/default. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/resumes/backgrounds/default`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(parsed.body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
