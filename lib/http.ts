import { NextResponse } from 'next/server';

export type ParsedBody =
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse };

export async function parseJsonBody(req: Request): Promise<ParsedBody> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Malformed JSON body' }, { status: 400 }),
    };
  }
}
