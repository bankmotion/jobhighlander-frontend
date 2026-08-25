'use client';

import { useMemo, useState } from 'react';
import { Modal } from './modal';
import { shortZone } from './meeting-time';
import type { InterviewPanel } from '@/lib/interviews';
import {
  allZones,
  browserZone,
  formatInZone,
  timeInZone,
  utcToWallClock,
  wallClockToUtc,
  zoneAbbrev,
  zoneOffsetLabel,
} from '@/lib/tz';

/** The request body both create and update send. */
export interface PanelPayload {
  title: string | null;
  note: string | null;
  meetingUrl: string | null;
  scheduledAt: string | null;
  timezone: string | null;
  durationMin: number | null;
}

const COMMON_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

/**
 * Create/edit form for one panel.
 *
 * Every field is optional, matching the column definitions: a panel gets made
 * the moment an email lands, when all that is known is "they want to talk next
 * week". Requiring anything here would mean inventing data to get past the
 * form.
 *
 * THE TIME AND ITS ZONE ARE ONE FIELD, not two that happen to sit together.
 * A wall clock without a zone is not a time — and since the recruiter picks the
 * zone, not the reader, the picker defaults to the reader's own only as a
 * starting point and is meant to be changed to whatever the email said.
 */
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
  /** null = creating a new panel. */
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
  // An existing panel reopens on the zone it was WRITTEN in, so editing the
  // note on a New York interview does not quietly re-stamp it as Dubai.
  const [zone, setZone] = useState(() => panel?.timezone ?? browserZone());
  const [wall, setWall] = useState(() => {
    const tz = panel?.timezone ?? browserZone();
    return panel?.scheduledAt ? utcToWallClock(new Date(panel.scheduledAt), tz) : '';
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const zones = useMemo(() => {
    const all = allZones();
    const common = [browserZone(), ...COMMON_ZONES].filter(
      (z, i, a) => all.includes(z) && a.indexOf(z) === i,
    );
    return { common, all };
  }, []);

  // Live echo of what will be stored, in both readings. This is the check that
  // catches a mis-picked zone before it becomes a missed interview.
  const preview = useMemo(() => {
    if (!wall || !zone) return null;
    const utc = wallClockToUtc(wall, zone);
    if (!utc) return null;
    const viewer = browserZone();
    return {
      source: `${formatInZone(utc, zone)} ${zoneAbbrev(utc, zone)}`,
      viewer: viewer === zone ? null : `${timeInZone(utc, viewer)} (${shortZone(viewer)})`,
      iso: utc.toISOString(),
    };
  }, [wall, zone]);

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
            <select
              id="panel-zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className={field}
            >
              <optgroup label="Common">
                {zones.common.map((z) => (
                  <option key={`c-${z}`} value={z}>
                    {shortZone(z)} — {zoneOffsetLabel(new Date(), z)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All time zones">
                {zones.all.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {preview && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm">
            <div className="text-[var(--text)]">{preview.source}</div>
            {preview.viewer && (
              <div className="mt-0.5 text-[var(--muted)]">{preview.viewer} your time</div>
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
          <label className={label} htmlFor="panel-note">
            Notes
          </label>
          <textarea
            id="panel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
