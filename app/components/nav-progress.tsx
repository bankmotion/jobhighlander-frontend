'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { setNavPending, resetNavPending } from '@/lib/nav-pending';

/**
 * Marks a navigation as in flight for EVERY internal link, app-wide.
 *
 * `useLinkStatus` only reports inside the `<Link>` that was clicked, so using
 * it everywhere would mean editing every link in the app and remembering to do
 * so for each new one. A single delegated listener on the document covers all
 * of them, including links added later, with nothing to remember.
 *
 * Clearing is driven by the pathname and search params actually changing,
 * which is the only reliable "we have arrived" signal available: App Router
 * exposes no navigation-complete event, and the destination decides how long
 * it takes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();

  // Arrived. Runs on every committed navigation, which is exactly when the
  // veil should come down.
  useEffect(() => {
    resetNavPending();
  }, [pathname, params]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Anything the browser handles itself, or that opens elsewhere, is not
      // a client navigation and must not raise the veil.
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;

      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, same query: React will not re-render anything, so a veil
      // would hang until the safety timeout.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      setNavPending(true);
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  // Back and forward do not go through a link click, and land with the veil
  // down already — but a popstate mid-navigation would otherwise strand it.
  useEffect(() => {
    const onPop = () => resetNavPending();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return null;
}
