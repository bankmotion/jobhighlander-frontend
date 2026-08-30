'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasFilterParams, storedJobFilters } from '@/lib/job-filters';

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
