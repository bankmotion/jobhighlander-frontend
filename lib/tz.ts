
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

export function timeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function zoneAbbrev(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
}

export function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function allZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf;
    const zones = fn?.('timeZone');
    if (zones?.length) return zones;
  } catch {}
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

export function zoneOffsetLabel(date: Date, timeZone: string): string {
  const mins = Math.round(tzOffsetMs(date.getTime(), timeZone) / 60000);
  const sign = mins < 0 ? '−' : '+';
  const abs = Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
