'use client';

import { useState } from 'react';
import { InterviewCalendar } from './interview-calendar';
import { CalendarTimeGrid } from './calendar-time-grid';
import { CalendarAgenda } from './calendar-agenda';
import { CalendarDetailPanel } from './calendar-detail-panel';
import type { CalendarView } from '@/lib/calendar';
import type { CalendarPanel } from '@/lib/interviews';

/**
 * The calendar's body, and the one place that knows which sitting is selected.
 *
 * EXISTS BECAUSE THE PAGE IS A SERVER COMPONENT. The grid data is fetched and
 * rendered on the server, but "which entry did you click" is client state, and
 * the drawer has to sit outside whichever view is showing so that switching
 * Month → Week does not tear it down. This is the smallest client boundary that
 * satisfies both: the page keeps its server render, this owns the selection.
 *
 * The selected panel is kept as the WHOLE object rather than an id, so the
 * drawer can paint its header and time immediately from data the grid already
 * had, and fill in the job and interview behind it.
 */
export function CalendarViews({
  view,
  days,
  anchorIso,
  panels,
}: {
  view: CalendarView;
  days: string[];
  anchorIso: string;
  panels: CalendarPanel[];
}) {
  const [selected, setSelected] = useState<CalendarPanel | null>(null);

  return (
    <>
      {view === 'month' && (
        <InterviewCalendar
          days={days}
          anchorIso={anchorIso}
          panels={panels}
          onSelect={setSelected}
        />
      )}

      {(view === 'week' || view === 'day') && (
        <div className="overflow-x-auto">
          {/* The week track needs room for seven columns; below that width it
              scrolls rather than crushing each day to an unreadable sliver.
              Agenda is the view that actually suits a phone. */}
          <div className={view === 'week' ? 'min-w-[42rem]' : ''}>
            <CalendarTimeGrid days={days} panels={panels} onSelect={setSelected} />
          </div>
        </div>
      )}

      {view === 'agenda' && (
        <CalendarAgenda days={days} panels={panels} onSelect={setSelected} />
      )}

      <CalendarDetailPanel panel={selected} onClose={() => setSelected(null)} />
    </>
  );
}
