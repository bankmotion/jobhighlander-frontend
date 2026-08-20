import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * POST /api/resumes/template — apply a template to the saved resume.
 *
 * The resume is addressed by (jobId, profileId) rather than by row id: exactly
 * one exists per pairing, and the client already knows both.
 */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/resumes/template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(parsed.body),
    cache: 'no-store',
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
