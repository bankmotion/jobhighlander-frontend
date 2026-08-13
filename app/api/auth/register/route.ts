import { NextResponse } from 'next/server';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const WEEK = 60 * 60 * 24 * 7;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  // First user is auto-approved (super_admin) and gets a token → log them in.
  const response = NextResponse.json({ status: data.status, email: data.email, role: data.role });
  if (data.status === 'active' && data.token) {
    response.cookies.set('token', data.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: WEEK,
    });
  }
  return response;
}
