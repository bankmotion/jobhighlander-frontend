import { cookies } from 'next/headers';
// From zone-init, NOT display-zone: that module calls createLocalStore() at the
// top level, and pulling it into the server graph runs that against a client
// reference. Same reason theme-init.ts exists separately from theme.ts.
import { TZ_COOKIE } from './zone-init';

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
