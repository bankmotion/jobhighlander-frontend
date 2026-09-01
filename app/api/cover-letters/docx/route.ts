import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function GET(req: Request) {
  const qs = new URL(req.url).searchParams.toString();
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}/api/cover-letters/docx?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  // See the PDF route: 204 is "no letter yet", distinct from a 404.
  if (res.status === 204) return new NextResponse(null, { status: 204 });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Cover letter render failed (${res.status})` }));
    return NextResponse.json(err, { status: res.status });
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': DOCX_MIME,
      'Content-Disposition':
        res.headers.get('content-disposition') ?? 'attachment; filename="cover.docx"',
    },
  });
}
