'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StageChip } from './stage-badge';
import { MeetingTime } from './meeting-time';
import { CalendarDetailPanel } from './calendar-detail-panel';
import type { CalendarPanel } from '@/lib/interviews';

// Upcoming meetings, opening the same right-to-left drawer the calendar uses.
//
// It reuses CalendarDetailPanel rather than a second component built to look
// like it. That matters beyond consistency: a job can carry several interview
// steps and several meetings within a step, and that panel already resolves a
// `panelId` to the exact step and meeting it belongs to. A panel keyed only on
// the interview would open the right job showing the wrong round.
export function InterviewAgendaList({
  agenda,
  timelineHrefFor,
}: {
  agenda: CalendarPanel[];
  // Built on the server, where the profile for each interview is known.
  timelineHrefFor: Record<number, string | null>;
}) {
  const [selected, setSelected] = useState<CalendarPanel | null>(null);

  return (
    <>
      <ul className="jh-stagger grid gap-3 sm:grid-cols-2">
        {agenda.map((p) => {
          const href = p.jobId ? timelineHrefFor[p.panelId] : null;
          return (
            <li
              key={p.panelId}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--border-strong)]"
            >
              <div className="mb-2 flex flex-wrap gap-1.5">
                {p.stages.map((s) => (
                  <StageChip key={s.id} stage={s} />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelected(p)}
                title="Open this meeting's details"
                className="block w-full text-left"
              >
                <p className="truncate text-sm font-semibold text-white transition hover:text-[var(--primary)]">
                  {p.jobCompany ?? 'Unknown company'}
                </p>
                <p className="mb-2 truncate text-xs text-[var(--muted)]">{p.jobTitle}</p>
              </button>

              <MeetingTime iso={p.scheduledAt} timezone={p.timezone} durationMin={p.durationMin} />

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {p.meetingUrl && (
                  <a
                    href={p.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[var(--primary)] transition hover:underline"
                  >
                    Join ↗
                  </a>
                )}
                {href && (
                  <Link
                    href={href}
                    className="text-xs text-[var(--muted)] transition hover:text-white"
                  >
                    Open timeline →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <CalendarDetailPanel panel={selected} onClose={() => setSelected(null)} />
    </>
  );
}
