import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * GET /api/resumes/status?profileId=&jobIds=1,2,3 — resume status for a page of
 * jobs, keyed by job id.
 *
 * The list page fetches this on the server for first paint; this proxy exists
 * for the client refresh after a generation finishes.
 */
export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/resumes/status?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
