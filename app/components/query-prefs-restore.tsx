'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { QueryPrefs } from '@/lib/view-prefs';

/**
 * Replays a page's saved query string on arrival.
 *
 * Only when the URL carries none of that page's own params, so a link someone
 * shared always beats what is stored locally — the same rule the job list uses.
 */
export function QueryPrefsRestore({ prefs, path }: { prefs: QueryPrefs; path: string }) {
  const router = useRouter();
  const params = useSearchParams();

  // Once per mount. `params` changing is what would re-trigger the effect, and
  // the navigation below changes `params`, so without the guard it re-runs on
  // the very navigation it just performed.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (prefs.hasParams(params)) return;
    const saved = prefs.stored();
    if (!saved) return;

    router.replace(`${path}?${saved}`);
  }, [params, path, prefs, router]);

  return null;
}
