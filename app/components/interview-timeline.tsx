'use client';

import { Fragment, useState } from 'react';
import { StageChip } from './stage-badge';
import { MeetingTime } from './meeting-time';
import { InterviewPanelModal, type PanelPayload } from './interview-panel-modal';
import { InterviewStepModal, type StepPayload } from './interview-step-modal';
import { ConfirmModal } from './confirm-modal';
import {
  INTERVIEW_STATUS_LABELS,
  STEP_RESULT_LABELS,
  type InterviewDetail,
  type InterviewPanel,
  type InterviewStatus,
  type InterviewStep,
  type StepResult,
} from '@/lib/interviews';
import type { StageType } from '@/lib/stage-types';

/**
 * The vertical interview timeline for one (job, profile).
 *
 * SHAPE: a rail of STEPS; each step wears one or more stage badges and holds
 * one or more PANELS. A step is a point in the process ("the tech round"); a
 * panel is a sitting inside it ("the 90 minutes with Sarah on Thursday"). The
 * split exists because those two genuinely differ — an onsite loop is one step
 * with four panels, and a rescheduled call is one step with two.
 *
 * STATE: every mutation endpoint returns the WHOLE timeline, so each write is
 * `setInterview(response)` with no refetch and no `router.refresh()`. That is
 * deliberate — insert-between renumbers sibling `sortOrder`s server-side, so a
 * client trying to patch its own copy would have to reimplement that ordering
 * and would drift from it the first time the two disagreed.
 */
export function InterviewTimeline({
  jobId,
  profileId,
  applied,
  initial,
  stageTypes,
}: {
  jobId: number;
  profileId: number | null;
  /** Timelines only open on a job already marked applied. */
  applied: boolean;
  initial: InterviewDetail | null;
  stageTypes: StageType[];
}) {
  const [interview, setInterview] = useState<InterviewDetail | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepModal, setStepModal] = useState<StepModalState>(null);
  const [panelModal, setPanelModal] = useState<PanelModalState>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  /**
   * One request helper for every write.
   *
   * Errors are surfaced, never swallowed: the backend refuses a `javascript:`
   * link and an unknown time zone with a message the user can act on, and
   * replacing those with a generic failure would turn a fixable typo into a
   * button that mysteriously does nothing.
   */
  async function call<T = InterviewDetail>(
    path: string,
    init: { method: string; body?: unknown },
  ): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: init.method,
        headers: { 'Content-Type': 'application/json' },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong');
        return null;
      }
      return data as T;
    } catch {
      setError('Could not reach the server');
      return null;
    } finally {
      setBusy(false);
    }
  }

  const apply = (next: InterviewDetail | null) => {
    if (next) setInterview(next);
  };

  async function start() {
    const next = await call('/api/interviews', {
      method: 'POST',
      body: { jobId, profileId },
    });
    apply(next);
  }

  async function saveStep(payload: StepPayload) {
    if (!interview || !stepModal) return;
    const next =
      stepModal.mode === 'add'
        ? await call(`/api/interviews/${interview.id}/steps`, {
            method: 'POST',
            body: { position: stepModal.position, ...payload },
          })
        : await call(`/api/interviews/steps/${stepModal.step.id}`, {
            method: 'PATCH',
            body: payload,
          });
    if (next) {
      apply(next);
      setStepModal(null);
    }
  }

  async function deleteStep() {
    if (!stepModal || stepModal.mode !== 'edit') return;
    const next = await call(`/api/interviews/steps/${stepModal.step.id}`, { method: 'DELETE' });
    if (next) {
      apply(next);
      setStepModal(null);
    }
  }

  async function savePanel(payload: PanelPayload) {
    if (!panelModal) return;
    const next =
      panelModal.mode === 'add'
        ? await call(`/api/interviews/steps/${panelModal.stepId}/panels`, {
            method: 'POST',
            body: { position: panelModal.position, ...payload },
          })
        : await call(`/api/interviews/panels/${panelModal.panel.id}`, {
            method: 'PATCH',
            body: payload,
          });
    if (next) {
      apply(next);
      setPanelModal(null);
    }
  }

  async function deletePanel() {
    if (!panelModal || panelModal.mode !== 'edit') return;
    const next = await call(`/api/interviews/panels/${panelModal.panel.id}`, { method: 'DELETE' });
    if (next) {
      apply(next);
      setPanelModal(null);
    }
  }

  async function setStatus(status: InterviewStatus) {
    if (!interview) return;
    apply(await call(`/api/interviews/${interview.id}`, { method: 'PATCH', body: { status } }));
  }

  async function deleteInterview() {
    if (!interview) return;
    const ok = await call<{ ok: boolean }>(`/api/interviews/${interview.id}`, { method: 'DELETE' });
    if (ok) {
      setInterview(null);
      setConfirmReset(false);
    }
  }

  /* ── gates ──────────────────────────────────────────────────────────── */

  if (!profileId) {
    return (
      <Empty>
        Interviews are tracked per profile — create one, or ask an admin to invite you to theirs.
      </Empty>
    );
  }

  if (!interview) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-[var(--muted)]">
          {applied
            ? 'No interview timeline for this job yet.'
            : 'Mark this job as applied first — timelines start from an application.'}
        </p>
        <button
          type="button"
          onClick={start}
          disabled={busy || !applied}
          className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Starting…' : 'Start tracking interviews'}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  /* ── the timeline ───────────────────────────────────────────────────── */

  const steps = interview.steps;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusChip status={interview.status} />
            <span className="text-xs text-[var(--muted)]">
              {steps.length} {steps.length === 1 ? 'step' : 'steps'}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            Opened by {interview.openedBy}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="interview-status">
            Interview status
          </label>
          <select
            id="interview-status"
            value={interview.status}
            onChange={(e) => setStatus(e.target.value as InterviewStatus)}
            disabled={busy}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
          >
            {(Object.keys(INTERVIEW_STATUS_LABELS) as InterviewStatus[]).map((s) => (
              <option key={s} value={s}>
                {INTERVIEW_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={busy}
            className="rounded-lg px-2.5 py-1.5 text-sm text-[var(--muted)] transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="relative">
        {/* The rail. Left-aligned on mobile, centred once there is room for
            cards on both sides. */}
        <div
          aria-hidden
          className="absolute bottom-2 left-4 top-2 w-px bg-[var(--border)] md:left-1/2"
        />

        <InsertRow label="Add step" onClick={() => setStepModal({ mode: 'add', position: 0 })} />

        {steps.map((step, i) => (
          <Fragment key={step.id}>
            <StepRow
              step={step}
              /* Alternating by STEP, not by panel: a step's panels belong
                 together and splitting them across the rail would read as two
                 unrelated stages. */
              side={i % 2 === 0 ? 'left' : 'right'}
              busy={busy}
              onEditStep={() => setStepModal({ mode: 'edit', step })}
              onAddPanel={(position) => setPanelModal({ mode: 'add', stepId: step.id, position })}
              onEditPanel={(panel) => setPanelModal({ mode: 'edit', panel })}
            />
            <InsertRow
              label="Add step"
              onClick={() => setStepModal({ mode: 'add', position: i + 1 })}
            />
          </Fragment>
        ))}

        {steps.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            No steps yet — add the first one above.
          </p>
        )}
      </div>

      <InterviewStepModal
        open={stepModal !== null}
        step={stepModal?.mode === 'edit' ? stepModal.step : null}
        stageTypes={stageTypes}
        busy={busy}
        error={error}
        onClose={() => setStepModal(null)}
        onSave={saveStep}
        onDelete={stepModal?.mode === 'edit' ? deleteStep : undefined}
      />

      <InterviewPanelModal
        open={panelModal !== null}
        panel={panelModal?.mode === 'edit' ? panelModal.panel : null}
        busy={busy}
        error={error}
        onClose={() => setPanelModal(null)}
        onSave={savePanel}
        onDelete={panelModal?.mode === 'edit' ? deletePanel : undefined}
      />

      <ConfirmModal
        open={confirmReset}
        title="Delete this timeline?"
        message="Every step, panel and note on it goes too. The applied mark on the job stays."
        busy={busy}
        onCancel={() => setConfirmReset(false)}
        onConfirm={deleteInterview}
      />
    </div>
  );
}

type StepModalState =
  | { mode: 'add'; position: number }
  | { mode: 'edit'; step: InterviewStep }
  | null;

type PanelModalState =
  | { mode: 'add'; stepId: number; position: number }
  | { mode: 'edit'; panel: InterviewPanel }
  | null;

/* ── rows ─────────────────────────────────────────────────────────────── */

/**
 * One step: the dot on the rail, the date opposite it, and the cards.
 *
 * The date is whatever the API derived from the earliest panel, so a step with
 * nothing scheduled shows no date rather than inventing one from `createdAt`.
 */
function StepRow({
  step,
  side,
  busy,
  onEditStep,
  onAddPanel,
  onEditPanel,
}: {
  step: InterviewStep;
  side: 'left' | 'right';
  busy: boolean;
  onEditStep: () => void;
  onAddPanel: (position: number) => void;
  onEditPanel: (panel: InterviewPanel) => void;
}) {
  const dateLabel = step.date ? formatRailDate(step.date) : null;

  const content = (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {step.stages.length > 0 ? (
          step.stages.map((s) => <StageChip key={s.id} stage={s} size="md" />)
        ) : (
          <span className="text-xs italic text-[var(--muted)]">No stage set</span>
        )}
        {step.result !== 'pending' && <ResultChip result={step.result} />}
        <button
          type="button"
          onClick={onEditStep}
          disabled={busy}
          className="ml-auto rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          Edit
        </button>
      </div>

      {step.title && (
        <h3 className="mb-2 text-sm font-semibold text-white">{step.title}</h3>
      )}

      {/* The date again, inline, where the rail has no second column to put
          it in. */}
      {dateLabel && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] md:hidden">
          {dateLabel}
        </p>
      )}

      <InsertRow small label="Add panel" onClick={() => onAddPanel(0)} />
      {step.panels.map((panel, i) => (
        <Fragment key={panel.id}>
          <PanelCard panel={panel} busy={busy} onEdit={() => onEditPanel(panel)} />
          <InsertRow small label="Add panel" onClick={() => onAddPanel(i + 1)} />
        </Fragment>
      ))}
    </div>
  );

  const dateCol = dateLabel ? (
    <p
      className={`hidden pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] md:block ${
        side === 'left' ? 'md:pl-8' : 'md:pr-8 md:text-right'
      }`}
    >
      {dateLabel}
    </p>
  ) : (
    <div className="hidden md:block" />
  );

  return (
    <div className="relative grid gap-0 py-1 md:grid-cols-2">
      <span
        aria-hidden
        className={`absolute left-4 top-3 h-3 w-3 -translate-x-1/2 rounded-full ring-4 md:left-1/2 ${
          DOT[step.result]
        }`}
      />
      {side === 'left' ? (
        <>
          <div className="pl-10 md:pl-0 md:pr-8">{content}</div>
          {dateCol}
        </>
      ) : (
        <>
          {dateCol}
          <div className="pl-10 md:pl-8">{content}</div>
        </>
      )}
    </div>
  );
}

/** One panel card — the white boxes on the rail. */
function PanelCard({
  panel,
  busy,
  onEdit,
}: {
  panel: InterviewPanel;
  busy: boolean;
  onEdit: () => void;
}) {
  const empty = !panel.title && !panel.scheduledAt && !panel.meetingUrl && !panel.note;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-3">
        <h4 className="min-w-0 text-sm font-semibold text-white">
          {panel.title ?? <span className="font-normal italic text-[var(--muted)]">Untitled</span>}
        </h4>
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="shrink-0 rounded px-1.5 py-0.5 text-xs text-[var(--muted)] transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          Edit
        </button>
      </div>

      {panel.scheduledAt && (
        <div className="mt-2">
          <MeetingTime
            iso={panel.scheduledAt}
            timezone={panel.timezone}
            durationMin={panel.durationMin}
          />
        </div>
      )}

      {panel.meetingUrl && (
        <a
          href={panel.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block max-w-full truncate text-xs font-medium text-[var(--primary)] transition hover:underline"
        >
          {panel.meetingUrl} ↗
        </a>
      )}

      {panel.note && (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)]/85">
          {panel.note}
        </p>
      )}

      {empty && (
        <p className="mt-1 text-xs italic text-[var(--muted)]">
          Nothing filled in yet — click Edit to add the time or a note.
        </p>
      )}
    </div>
  );
}

/**
 * The insert affordance that lives in every gap.
 *
 * Always visible rather than hover-only. A hover-revealed control is
 * undiscoverable on touch and invisible to keyboard users, and inserting a step
 * in the middle is the normal case here — a process is rarely logged in order.
 */
function InsertRow({
  label,
  onClick,
  small = false,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <div className={small ? 'py-1' : 'py-1.5'}>
      <button
        type="button"
        onClick={onClick}
        className={`group flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] ${
          small ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <span aria-hidden className="font-bold leading-none">
          +
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}

/* ── chips ────────────────────────────────────────────────────────────── */

/**
 * Complete literal class strings per state.
 *
 * Tailwind v4 scans source statically, so a composed `bg-${tone}-500` compiles
 * to no CSS whatsoever — silently, and with no build error.
 */
const DOT: Record<StepResult, string> = {
  pending: 'bg-[var(--surface-2)] ring-[var(--bg)]',
  passed: 'bg-emerald-500 ring-[var(--bg)]',
  failed: 'bg-red-500 ring-[var(--bg)]',
  cancelled: 'bg-amber-500 ring-[var(--bg)]',
};

const RESULT_CHIP: Record<StepResult, string> = {
  pending: 'bg-white/10 text-[var(--muted)]',
  passed: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-amber-500/15 text-amber-300',
};

function ResultChip({ result }: { result: StepResult }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RESULT_CHIP[result]}`}>
      {STEP_RESULT_LABELS[result]}
    </span>
  );
}

const STATUS_CHIP: Record<InterviewStatus, string> = {
  active: 'bg-blue-500/15 text-blue-300',
  offer: 'bg-emerald-500/15 text-emerald-300',
  accepted: 'bg-emerald-500 text-white',
  rejected: 'bg-red-500/15 text-red-300',
  withdrawn: 'bg-white/10 text-[var(--muted)]',
  ghosted: 'bg-amber-500/15 text-amber-300',
  on_hold: 'bg-purple-500/15 text-purple-300',
};

export function StatusChip({ status }: { status: InterviewStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[status]}`}
    >
      {INTERVIEW_STATUS_LABELS[status]}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-[var(--muted)]">{children}</p>;
}

/**
 * "MAR 18, 2026" — the rail label.
 *
 * Formatted in UTC with a pinned locale so the server and the browser produce
 * the same string. The rail is a coarse marker, not the meeting time; the exact
 * time lives on the panel card, where `MeetingTime` renders it in both the
 * quoted zone and the reader's.
 */
function formatRailDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
    .format(new Date(iso))
    .toUpperCase();
}
