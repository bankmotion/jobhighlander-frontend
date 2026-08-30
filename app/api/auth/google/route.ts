import { NextResponse } from 'next/server';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const WEEK = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const res = await fetch(`${API}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.body),
  });
  const data = await res.json().catch(() => ({}));
  // Pass the status through unchanged — the login page distinguishes 403
  // (pending approval) from every other failure.
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ email: data.email, role: data.role });
  response.cookies.set('token', data.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: WEEK,
  });
  return response;
}
