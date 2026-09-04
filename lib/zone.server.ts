import { cookies } from 'next/headers';
import { TZ_COOKIE } from './display-zone';

/**
 * The viewer's display zone, as the server sees it.
 *
 * Read from the cookie the client mirrors its localStorage preference into.
 * Absent means the browser has not told us yet — UTC is the honest answer
 * then, and it matches what the API falls back to.
 */
export async function displayZone(): Promise<string> {
  try {
    return (await cookies()).get(TZ_COOKIE)?.value || 'UTC';
  } catch {
    return 'UTC';
  }
}
