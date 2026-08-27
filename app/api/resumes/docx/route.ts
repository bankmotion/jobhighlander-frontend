import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parseJsonBody } from '@/lib/http';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Proxies the DOCX render. Same shape as the PDF route — binary is forwarded as
 * an ArrayBuffer, since `NextResponse.json` would corrupt the file.
 */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/resumes/docx`, {
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
    const err = await res
      .json()
      .catch(() => ({ error: `DOCX render failed (${res.status})` }));
    return NextResponse.json(err, { status: res.status });
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': DOCX_MIME,
      'Content-Disposition':
        res.headers.get('content-disposition') ?? 'attachment; filename="resume.docx"',
    },
  });
}
