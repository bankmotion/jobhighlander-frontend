'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const POLL_MS = 5 * 60 * 1000;

// Tells the reader when the scrapers have found jobs their list does not show
// yet, without moving anything under them.
//
// It polls rather than refreshing on its own: the list re-sorting itself while
// someone is halfway through reading a posting is the behaviour this avoids.
// Nothing changes until the button is pressed.
//
// The baseline is `latestId` from the list response, NOT the highest id on
// screen. Those differ on every page after the first, and using the visible
// maximum would report new jobs that are merely older than the page you are on.
export function NewJobsBanner({
  latestId,
  query,
}: {
  latestId: number;
  // The filters the list was built with, so the count matches what pressing the
  // button would actually bring in.
  query: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // In a ref so the interval is set up once; re-subscribing on every count
  // change would restart the five-minute clock each time.
  const latestRef = useRef(latestId);
  latestRef.current = latestId;
  const queryRef = useRef(query);
  queryRef.current = query;

  const check = useCallback(async () => {
    if (!latestRef.current) return;
    try {
      const qs = new URLSearchParams(queryRef.current);
      qs.set('afterId', String(latestRef.current));
      const res = await fetch(`/api/jobs/new-count?${qs}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      setCount(data.count ?? 0);
    } catch {
      // A failed poll is not worth surfacing: the list is still correct, it is
      // only the "there is more" hint that is missing.
    }
  }, []);

  useEffect(() => {
    // Not on mount: the page was just rendered, so the count is zero by
    // definition and an immediate request would only add load.
    const id = setInterval(check, POLL_MS);
    // Catch up when a backgrounded tab is returned to, where timers are
    // throttled and the count would otherwise be stale.
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  // A fresh render resets the baseline, so the banner clears itself.
  useEffect(() => {
    setCount(0);
  }, [latestId]);

  if (count < 1) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setLoading(true);
          router.refresh();
        }}
        className="jh-bob pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-2xl transition hover:bg-[var(--primary-hover)] disabled:opacity-70"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14" />
          <path d="M19 12l-7 7-7-7" />
        </svg>
        {loading ? 'Loading…' : `Show ${count} new ${count === 1 ? 'job' : 'jobs'}`}
      </button>
    </div>
  );
}
