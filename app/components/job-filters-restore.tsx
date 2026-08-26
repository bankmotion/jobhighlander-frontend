'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasFilterParams, storedJobFilters } from '@/lib/job-filters';

/**
 * Re-apply the remembered filters when the job list is opened without any.
 *
 * Renders nothing; it exists purely for the navigation. It has to be a client
 * component because localStorage is unreachable on the server, which is also
 * why the restore is a redirect rather than part of the first render: the
 * server cannot know what to filter by until the browser tells it.
 *
 * ONLY WHEN THE URL IS SILENT ABOUT FILTERING. A shared link, a bookmark, or a
 * "Clear all" must all win over the store — otherwise the remembered state
 * becomes impossible to escape, which is the failure mode that makes persisted
 * filters worse than none.
 *
 * `router.replace`, not `push`: the unfiltered URL was never a destination the
 * user chose, so leaving it in history would make Back appear to do nothing.
 *
 * The trade-off is a brief unfiltered paint before the redirect lands. It costs
 * one render on a bare visit only, and the alternative — blocking the list on a
 * value only the browser has — is worse.
 */
export function JobFiltersRestore({ profileId }: { profileId: number | null }) {
  const router = useRouter();
  const params = useSearchParams();

  // Once per mount. Without the guard the effect re-runs on the very navigation
  // it just performed, and `params` changing is exactly what re-triggers it.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (hasFilterParams(params)) return;
    const saved = storedJobFilters();
    if (!saved) return;

    const next = new URLSearchParams(saved);
    // Carried through so restoring filters cannot silently switch candidate.
    if (profileId) next.set('profile', String(profileId));
    router.replace(`/?${next.toString()}`);
  }, [params, profileId, router]);

  return null;
}
