import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function GET() {
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/profiles/all`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  return NextResponse.json(await res.json().catch(() => null), { status: res.status });
}
