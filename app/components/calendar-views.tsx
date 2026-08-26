'use client';

import { useEffect, useState } from 'react';
import { InterviewCalendar } from './interview-calendar';
import { CalendarTimeGrid } from './calendar-time-grid';
import { CalendarAgenda } from './calendar-agenda';
import { CalendarDetailPanel } from './calendar-detail-panel';
import type { CalendarView } from '@/lib/calendar';
import type { CalendarPanel } from '@/lib/interviews';

/** The query key the open drawer writes. */
const PANEL_KEY = 'panel';

/**
 * The calendar's body, and the one place that knows which sitting is selected.
 *
 * EXISTS BECAUSE THE PAGE IS A SERVER COMPONENT. The grid data is fetched and
 * rendered on the server, but "which entry did you click" is client state, and
 * the drawer must sit outside whichever view is showing so that switching
 * Month → Week does not tear it down.
 *
 * THE SELECTION LIVES IN THE URL as `?panel=<id>`, which buys three things a
 * pure state variable does not: the open drawer is a link you can send someone,
 * a reload puts it back, and the browser Back button closes it — which is what
 * every user tries first.
 *
 * `initialPanelId` comes from the SERVER's reading of the same query string, so
 * a drawer that should be open on arrival is open in the first paint. Reading
 * `window.location` in a `useState` initialiser instead would render closed on
 * the server and open on the client, which is a hydration mismatch on the one
 * element whose whole appearance is a transform.
 */
export function CalendarViews({
  view,
  days,
  anchorIso,
  panels,
  initialPanelId,
}: {
  view: CalendarView;
  days: string[];
  anchorIso: string;
  panels: CalendarPanel[];
  /** From `?panel=` on the server, or null. */
  initialPanelId: number | null;
}) {
  const [selected, setSelected] = useState<CalendarPanel | null>(
    () => panels.find((p) => p.panelId === initialPanelId) ?? null,
  );

  /**
   * Re-read the selection whenever the SERVER sends a different period.
   *
   * Paging to the next month is a Next navigation: the URL loses `?panel=`
   * because the nav links do not carry it — a sitting in August is not in
   * September's set — but this component stays mounted, so without this the
   * drawer would sit open showing an entry the grid behind it no longer holds.
   *
   * Adjusting state DURING RENDER rather than in an effect, the same pattern
   * the badge providers use: React discards this render and re-runs it
   * immediately, so nothing paints in the inconsistent state.
   *
   * Keyed on the period AND the incoming param, not on `panels`, so opening a
   * drawer — which only pushes a URL and never re-renders the server — does not
   * trip it.
   */
  const navKey = `${view}|${anchorIso}|${initialPanelId ?? ''}`;
  const [lastNav, setLastNav] = useState(navKey);
  if (lastNav !== navKey) {
    setLastNav(navKey);
    setSelected(panels.find((p) => p.panelId === initialPanelId) ?? null);
  }

  /**
   * `history.pushState`, NOT `router.push`.
   *
   * This page is `force-dynamic`, so a Next navigation would refetch the whole
   * month's RSC payload just to record which drawer is open. The URL is the
   * only thing that needs to change. Same reasoning as `job-tabs.tsx`.
   *
   * PUSH on open and REPLACE on close, deliberately asymmetric: pushing on open
   * is what makes Back close the drawer, and replacing on close avoids stacking
   * a second entry that Back would then have to step over.
   */
  function select(panel: CalendarPanel) {
    setSelected(panel);
    const url = new URL(window.location.href);
    url.searchParams.set(PANEL_KEY, String(panel.panelId));
    window.history.pushState(null, '', url);
  }

  function close() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete(PANEL_KEY);
    window.history.replaceState(null, '', url);
  }

  // Back and Forward. setState from an event listener, not synchronously in the
  // effect body, so this is a subscription rather than the cascading render the
  // compiler lint rejects.
  useEffect(() => {
    const onPop = () => {
      const id = Number(new URLSearchParams(window.location.search).get(PANEL_KEY));
      setSelected(panels.find((p) => p.panelId === id) ?? null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [panels]);

  return (
    <>
      {view === 'month' && (
        <InterviewCalendar days={days} anchorIso={anchorIso} panels={panels} onSelect={select} />
      )}

      {(view === 'week' || view === 'day') && (
        <div className="overflow-x-auto">
          {/* The week track needs room for seven columns; below that width it
              scrolls rather than crushing each day to an unreadable sliver.
              Agenda is the view that actually suits a phone. */}
          <div className={view === 'week' ? 'min-w-[42rem]' : ''}>
            <CalendarTimeGrid days={days} panels={panels} onSelect={select} />
          </div>
        </div>
      )}

      {view === 'agenda' && <CalendarAgenda days={days} panels={panels} onSelect={select} />}

      <CalendarDetailPanel panel={selected} onClose={close} />
    </>
  );
}
