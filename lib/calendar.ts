
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export const CALENDAR_VIEWS: CalendarView[] = ['month', 'week', 'day', 'agenda'];

export const isCalendarView = (v: string): v is CalendarView =>
  (CALENDAR_VIEWS as string[]).includes(v);

export function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseIsoDate(value: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return null;
  const [, y, mo, d] = m.map(Number);
  if (y < 1970 || y > 2999 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Rejects the 31st of a 30-day month rather than silently rolling into the
  // next one, which would put the header a day off the URL that produced it.
  return date.getUTCMonth() === mo - 1 ? date : null;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function addMonths(d: Date, n: number): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  // Clamp the day so 31 Jan + 1 month is 28/29 Feb rather than 2/3 March.
  const lastDay = new Date(Date.UTC(out.getUTCFullYear(), out.getUTCMonth() + 1, 0)).getUTCDate();
  out.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return out;
}

export function startOfWeek(d: Date): Date {
  return addDays(d, -d.getUTCDay());
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function visibleDays(view: CalendarView, anchor: Date): string[] {
  if (view === 'day') return [isoDate(anchor)];
  if (view === 'week' || view === 'agenda') {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => isoDate(addDays(start, i)));
  }
  const start = startOfWeek(startOfMonth(anchor));
  return Array.from({ length: 42 }, (_, i) => isoDate(addDays(start, i)));
}

export function fetchRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  const days = visibleDays(view, anchor);
  const first = parseIsoDate(days[0])!;
  const last = parseIsoDate(days[days.length - 1])!;
  return { from: addDays(first, -2), to: addDays(addDays(last, 1), 2) };
}

export function shiftAnchor(view: CalendarView, anchor: Date, delta: number): Date {
  if (view === 'month') return addMonths(anchor, delta);
  if (view === 'day') return addDays(anchor, delta);
  return addDays(anchor, delta * 7); // week and agenda
}

export function periodLabel(view: CalendarView, anchor: Date): string {
  if (view === 'month') return fmt(anchor, { month: 'long', year: 'numeric' });
  if (view === 'day') {
    return fmt(anchor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const left = fmt(start, { month: 'short', day: 'numeric' });
  const right = fmt(end, sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
  return `${left} – ${right}, ${end.getUTCFullYear()}`;
}

function fmt(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).format(d);
}

export function weekdayLabel(dayKey: string, long = false): string {
  const d = parseIsoDate(dayKey);
  return d ? fmt(d, { weekday: long ? 'long' : 'short' }) : '';
}

export function dayNumber(dayKey: string): number {
  return parseIsoDate(dayKey)?.getUTCDate() ?? 0;
}

export function inMonth(dayKey: string, anchor: Date): boolean {
  const d = parseIsoDate(dayKey);
  return d ? d.getUTCMonth() === anchor.getUTCMonth() && d.getUTCFullYear() === anchor.getUTCFullYear() : false;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKeyInZone(date: Date, zone: string): string {
  // `en-CA` formats as ISO order; the locale is pinned so it cannot drift.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function minutesInDay(date: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  // Some ICU builds render midnight as hour 24 under hour12:false, which would
  // put a 00:15 meeting at the bottom of the track instead of the top.
  return (get('hour') % 24) * 60 + get('minute');
}

export function hourLabel(hour: number): string {
  const h = hour % 24;
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${suffix}`;
}
