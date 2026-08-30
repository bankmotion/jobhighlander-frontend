'use client';

import { useEffect, useState } from 'react';
import { InterviewCalendar } from './interview-calendar';
import { CalendarTimeGrid } from './calendar-time-grid';
import { CalendarAgenda } from './calendar-agenda';
import { CalendarDetailPanel } from './calendar-detail-panel';
import type { CalendarView } from '@/lib/calendar';
import type { CalendarPanel } from '@/lib/interviews';

const PANEL_KEY = 'panel';

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
  initialPanelId: number | null;
}) {
  const [selected, setSelected] = useState<CalendarPanel | null>(
    () => panels.find((p) => p.panelId === initialPanelId) ?? null,
  );

  const navKey = `${view}|${anchorIso}|${initialPanelId ?? ''}`;
  const [lastNav, setLastNav] = useState(navKey);
  if (lastNav !== navKey) {
    setLastNav(navKey);
    setSelected(panels.find((p) => p.panelId === initialPanelId) ?? null);
  }

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
