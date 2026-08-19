import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function PUT(req: Request) {
  const token = (await cookies()).get('token')?.value;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  const res = await fetch(`${API}/api/scraper-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
