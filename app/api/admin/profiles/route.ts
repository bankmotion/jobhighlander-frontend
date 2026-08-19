import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function auth() {
  const token = (await cookies()).get('token')?.value;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function GET() {
  const res = await fetch(`${API}/api/profiles`, { headers: await auth(), cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const res = await fetch(`${API}/api/profiles`, {
    method: 'POST',
    headers: await auth(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
