import { NextResponse } from 'next/server';

export type ParsedBody =
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse };

/**
 * Parse a JSON request body, or produce a 400.
 *
 * Never fall back to `{}` here. An empty object forwarded to the API is
 * indistinguishable from a deliberate "set every field to nothing" write: the
 * backend accepts it with a 200 and wipes the record. A body that failed to
 * parse is a client error and has to say so.
 */
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
