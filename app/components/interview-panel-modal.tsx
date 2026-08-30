'use client';

import { useMemo, useState } from 'react';
import { Modal } from './modal';
import { useDisplayZone } from '@/lib/display-zone';
import { shortZone } from './meeting-time';
import { TimezoneSelect } from './timezone-select';
import type { InterviewPanel } from '@/lib/interviews';
import {
  browserZone,
  formatInZone,
  timeInZone,
  utcToWallClock,
  wallClockToUtc,
  zoneAbbrev,
} from '@/lib/tz';

export interface PanelPayload {
  title: string | null;
  note: string | null;
  meetingUrl: string | null;
  scheduledAt: string | null;
  timezone: string | null;
  durationMin: number | null;
}

const NOTE_MAX_CHARS = 16_000;

export function InterviewPanelModal({
  open,
  panel,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  panel: InterviewPanel | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: PanelPayload) => void;
  onDelete?: () => void;
}) {
  // Seeded once per mount, never synced by an effect. The parent gives this
  // component a `key` that changes whenever a different panel (or a new one) is
  // opened, so opening the dialog remounts it and these initialisers run again
  // against the right subject. A reset effect would instead fight the user's
  // typing every time the parent re-rendered mid-edit.
  const [title, setTitle] = useState(panel?.title ?? '');
  const [note, setNote] = useState(panel?.note ?? '');
  const [meetingUrl, setMeetingUrl] = useState(panel?.meetingUrl ?? '');
  const [duration, setDuration] = useState(
    panel?.durationMin != null ? String(panel.durationMin) : '',
  );
  // The reader's display zone seeds a NEW panel, because it is the clock they
  // are thinking in. An existing panel always reopens on the zone it was
  // WRITTEN in, so editing the note on a New York interview cannot quietly
  // re-stamp it as whatever the reader currently has selected.
  const displayZone = useDisplayZone() ?? browserZone();
  const [zone, setZone] = useState(() => panel?.timezone ?? displayZone);
  const [wall, setWall] = useState(() => {
    const tz = panel?.timezone ?? displayZone;
    return panel?.scheduledAt ? utcToWallClock(new Date(panel.scheduledAt), tz) : '';
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Live echo of what will be stored, in both readings. This is the check that
  // catches a mis-picked zone before it becomes a missed interview.
  const preview = useMemo(() => {
    if (!wall || !zone) return null;
    const utc = wallClockToUtc(wall, zone);
    if (!utc) return null;
    return {
      source: `${formatInZone(utc, zone)} ${zoneAbbrev(utc, zone)}`,
      viewer:
        displayZone === zone
          ? null
          : `${timeInZone(utc, displayZone)} in ${shortZone(displayZone)}`,
      iso: utc.toISOString(),
    };
  }, [wall, zone, displayZone]);

  function save() {
    const trimmedUrl = meetingUrl.trim();
    const mins = duration.trim() === '' ? null : Number(duration);
    onSave({
      title: title.trim() || null,
      note: note.trim() || null,
      meetingUrl: trimmedUrl || null,
      // The zone is stored only alongside a time. Keeping one without the other
      // would leave a row that claims a zone for nothing.
      scheduledAt: preview?.iso ?? null,
      timezone: preview ? zone : null,
      durationMin: mins != null && Number.isFinite(mins) && mins > 0 ? Math.round(mins) : null,
    });
  }

  const field = 'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]';
  const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]';

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={panel ? 'Edit panel' : 'Add panel'}
      subtitle="Every field is optional — fill in what the email actually said."
      footer={
        <>
          {onDelete && panel && (
            <button
              type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              disabled={busy}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {confirmDelete ? 'Click again to delete' : 'Delete'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <div>
          <label className={label} htmlFor="panel-title">
            Title
          </label>
          <input
            id="panel-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Call with Sarah (Recruiter)"
            className={field}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="panel-when">
              Date &amp; time
            </label>
            <input
              id="panel-when"
              type="datetime-local"
              value={wall}
              onChange={(e) => setWall(e.target.value)}
              className={`${field} [color-scheme:dark]`}
            />
          </div>
          <div>
            <label className={label} htmlFor="panel-zone">
              …in this time zone
            </label>
            <TimezoneSelect
              id="panel-zone"
              value={zone}
              deviceZone={displayZone}
              onChange={(z) => setZone(z ?? displayZone)}
            />
          </div>
        </div>

        {preview && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm">
            <div className="text-[var(--text)]">{preview.source}</div>
            {preview.viewer && (
              <div className="mt-0.5 text-[var(--muted)]">{preview.viewer}</div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className={label} htmlFor="panel-link">
              Meeting link
            </label>
            <input
              id="panel-link"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/…"
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="panel-duration">
              Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                id="panel-duration"
                type="number"
                min={0}
                max={1440}
                step={15}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                className={`${field} w-24`}
              />
              <span className="text-sm text-[var(--muted)]">min</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className={label} htmlFor="panel-note">
              Notes
            </label>
            {note.length > NOTE_MAX_CHARS * 0.75 && (
              <span
                className={`mb-1.5 text-xs ${
                  note.length >= NOTE_MAX_CHARS ? 'text-red-400' : 'text-[var(--muted)]'
                }`}
              >
                {note.length.toLocaleString()} / {NOTE_MAX_CHARS.toLocaleString()}
              </span>
            )}
          </div>
          <textarea
            id="panel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            // Hard stop in the browser as well as at the API. Without it the
            // only feedback on an over-long note is a rejected save after the
            // typing is already done.
            maxLength={NOTE_MAX_CHARS}
            rows={5}
            placeholder="Who you're meeting, what they said to prepare, how it went afterwards…"
            className={`${field} resize-y`}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
