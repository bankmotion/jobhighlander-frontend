'use client';

import { usePathname } from 'next/navigation';

// Replays the entry animation on every route change.
//
// The `key` is what does the work: React remounts the wrapper when the pathname
// changes, and a remounted element restarts its CSS animation. Without it the
// animation would play once on first load and never again, because the DOM node
// survives client-side navigation.
//
// `usePathname` needs no Suspense boundary here — that requirement only applies
// under `cacheComponents`, which this app does not enable.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="jh-page">
      {children}
    </div>
  );
}
