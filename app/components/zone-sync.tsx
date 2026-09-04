'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDisplayZone, writeZoneCookie, zoneCookie } from '@/lib/display-zone';
import { browserZone } from '@/lib/tz';

/**
 * Keeps the server's idea of the viewer's time zone in step with the client's.
 *
 * The zone preference lives in localStorage, which a server component cannot
 * read, so it is mirrored into a cookie. Two moments need this component:
 *
 *   1. First load after the preference existed but the cookie did not — every
 *      stats page would render UTC windows until the user happened to navigate.
 *   2. Changing the zone in the top bar — the stats pages are server-rendered,
 *      so writing the cookie alone changes nothing on screen. Without the
 *      refresh, picking a new zone appears to do nothing at all.
 *
 * Renders nothing. Mounted once in the app layout.
 */
export function ZoneSync() {
  const zone = useDisplayZone();
  const router = useRouter();

  useEffect(() => {
    // `null` means "follow the device": the server cannot resolve that, so the
    // cookie carries the concrete zone the browser reports.
    const effective = zone ?? browserZone();
    if (!effective) return;
    // Compared, not written unconditionally — an unconditional write followed
    // by a refresh would loop, since the refresh re-runs this effect.
    if (zoneCookie() === effective) return;
    writeZoneCookie(effective);
    // Re-renders server components with the new cookie. The router dedupes
    // concurrent refreshes, and the guard above stops the next pass.
    router.refresh();
  }, [zone, router]);

  return null;
}
