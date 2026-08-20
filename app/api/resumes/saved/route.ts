import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * GET /api/resumes/saved?jobId=&profileId= — the one resume stored for this
 * pairing, or null.
 *
 * The fallback is `null` rather than `{}`: the client treats a falsy body as
 * "nothing generated yet", and an empty object would read as a resume with no
 * fields and blank the page instead.
 */
export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/resumes/saved?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  return NextResponse.json(await res.json().catch(() => null), { status: res.status });
}
