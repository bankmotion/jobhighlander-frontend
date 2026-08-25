/**
 * Time-zone arithmetic for interview panels, on `Intl` alone.
 *
 * A meeting has two readings that both matter and neither of which can be
 * derived from the other alone:
 *
 *   - the INSTANT, stored UTC, which is what sorts and alarms;
 *   - the WALL CLOCK the recruiter wrote ("2:00 PM Eastern"), which is what
 *     the candidate will be checked against.
 *
 * Showing only the reader's local time is how someone joins an hour late while
 * believing the dashboard, so every panel renders both — and to render both,
 * the app has to be able to convert between them for an ARBITRARY IANA zone,
 * not just the browser's own. That is what this file does.
 *
 * No dependency: `Intl.DateTimeFormat.formatToParts` already knows every zone's
 * offset and DST rules, and reading it back is enough. Pulling in date-fns-tz
 * or luxon would add ~20 kB to a page that needs these six functions.
 */

/**
 * How far `timeZone` is ahead of UTC at a given instant, in milliseconds.
 *
 * Works by formatting the instant IN that zone, then reading the resulting wall
 * clock back as if it were UTC. The difference between that and the real
 * instant is the offset — which is the only way to get a zone's offset out of
 * `Intl`, since it exposes no numeric accessor for it.
 */
export function tzOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  // Some ICU builds render midnight as hour 24 under hour12:false; Date.UTC
  // would roll that into the next day and put the offset out by 24 hours.
  const hour = get('hour') % 24;

  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asIfUtc - utcMs;
}

/**
 * Turn a wall clock in a named zone into the UTC instant it denotes.
 *
 * `wall` is the value of an `<input type="datetime-local">`: "2026-04-03T14:00".
 *
 * TWO PASSES, and the second one is not optional. The first guess subtracts the
 * offset that applies at the *guessed* instant, but on a DST changeover day the
 * offset at the guess and the offset at the answer differ — so the guess lands
 * an hour out exactly on the days people most often schedule around. Re-reading
 * the offset at the corrected instant and redoing the subtraction fixes it.
 *
 * A wall clock inside a spring-forward gap does not exist; this resolves it
 * forward, which matches what calendar software does with the same input.
 */
export function wallClockToUtc(wall: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m.map(Number) as unknown as number[];

  const guess = Date.UTC(y, mo - 1, d, hh, mm);
  const offset1 = tzOffsetMs(guess, timeZone);
  let utc = guess - offset1;

  const offset2 = tzOffsetMs(utc, timeZone);
  if (offset2 !== offset1) utc = guess - offset2;

  return new Date(utc);
}

/**
 * The inverse: the wall clock a UTC instant shows in `timeZone`, formatted for
 * an `<input type="datetime-local">` so the edit form reopens on the value the
 * recruiter actually wrote rather than on the reader's local time.
 */
export function utcToWallClock(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * "Thu, Apr 3 · 2:00 PM" as it reads in `timeZone`.
 *
 * Locale PINNED to en-US, not left to the runtime default. This string is
 * rendered on the server and hydrated in the browser, and `undefined` resolves
 * to whatever locale each side happens to run under — an en-GB browser against
 * an en-US server would produce "3 Apr" over "Apr 3" and React would tear the
 * node down as a mismatch.
 */
export function formatInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Just the clock part — "2:00 PM" — for the second line of a two-zone stamp. */
export function timeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * The short zone name at that instant — "EDT", not "EST", in April.
 *
 * Taken from the formatter rather than from a table because it is
 * DST-dependent, and a stamp reading "EST" beside a July meeting is the exact
 * kind of small wrongness that makes a candidate re-check the email instead of
 * trusting the dashboard.
 */
export function zoneAbbrev(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
}

/**
 * The reader's own zone.
 *
 * CLIENT ONLY — call it from an effect, never during render. The server has no
 * idea where the reader is, so using it in the first paint would either
 * hydration-mismatch or silently print the server's zone as the user's.
 */
export function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Every zone the runtime knows, for the picker.
 *
 * `supportedValuesOf` is ES2022 and missing in older Safari, so a short list of
 * the zones this app's postings actually cluster in is the fallback — an empty
 * dropdown would make the field unusable rather than merely less complete.
 */
export function allZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    const zones = fn?.('timeZone');
    if (zones?.length) return zones;
  } catch {
    /* fall through */
  }
  return [
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Toronto',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Dublin',
    'Europe/Lisbon',
    'Europe/Berlin',
    'Europe/Paris',
    'Europe/Amsterdam',
    'Europe/Warsaw',
    'Europe/Kyiv',
    'Europe/Istanbul',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'UTC',
  ];
}

/** "UTC−04:00" for the zone at that instant, so the picker reads unambiguously. */
export function zoneOffsetLabel(date: Date, timeZone: string): string {
  const mins = Math.round(tzOffsetMs(date.getTime(), timeZone) / 60000);
  const sign = mins < 0 ? '−' : '+';
  const abs = Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
