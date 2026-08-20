import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Forward a route-handler call to the backend with the session JWT attached,
 * relaying the backend's status and body unchanged.
 *
 * Relaying the status matters: the browser never talks to the backend directly,
 * so a handler that swallowed a 403 into a 200 would show the user a success
 * for a write the API refused — which is exactly what a read-only invitee
 * hitting the profile PUT must not see.
 */
export async function proxy(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<NextResponse> {
  const token = (await cookies()).get('token')?.value;
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
