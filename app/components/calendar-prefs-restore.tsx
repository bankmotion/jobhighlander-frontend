'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  hasCalendarPrefParams,
  saveCalendarPrefs,
  storedCalendarPrefs,
} from '@/lib/calendar-prefs';

/**
 * Remembers the calendar's view and profile filter, and restores them.
 *
 * Both halves live here rather than in the controls: the view switcher and the
 * profile picker are plain links, so there is no click handler to save from,
 * and adding one to each would mean two places to keep in step. Watching the
 * URL catches every route into a new view — links, the back button, a pasted
 * address — with one rule.
 */
export function CalendarPrefsRestore() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Restore runs once per mount. Without the guard the effect re-runs on the
  // very navigation it just performed, and `params` changing is exactly what
  // re-triggers it.
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    // An explicit view or profile in the URL is a deliberate choice — a shared
    // link, a bookmark — and outranks what was stored.
    if (hasCalendarPrefParams(params)) return;
    const saved = storedCalendarPrefs();
    if (!saved) return;
    router.replace(`${pathname}?${saved}`);
  }, [params, pathname, router]);

  // Save on every change, INCLUDING the restore above: writing back what was
  // just read is harmless, and the alternative is a rule about which writes
  // count that would have to stay true as the page grows.
  useEffect(() => {
    saveCalendarPrefs(params.toString());
  }, [params]);

  return null;
}
