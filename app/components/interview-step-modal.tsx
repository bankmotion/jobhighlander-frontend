'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { StageBadgePicker } from './stage-badge';
import { STEP_RESULT_LABELS, type InterviewStep, type StageBadge, type StepResult } from '@/lib/interviews';
import type { StageType } from '@/lib/stage-types';

export interface StepPayload {
  title: string | null;
  result?: StepResult;
  stageTypeIds: number[];
}

const RESULTS: StepResult[] = ['pending', 'passed', 'failed', 'cancelled'];

export function InterviewStepModal({
  open,
  step,
  stageTypes,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  step: InterviewStep | null;
  stageTypes: StageType[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: StepPayload) => void;
  onDelete?: () => void;
}) {
  // Seeded once per mount, never synced by an effect. The parent gives this
  // component a `key` that changes whenever a different step (or a new one) is
  // opened, so opening the dialog remounts it and these initialisers run again
  // against the right subject. That replaces a reset effect — which the React
  // Compiler lint rejects, and which would fight the user's typing whenever the
  // parent re-rendered mid-edit.
  const [title, setTitle] = useState(step?.title ?? '');
  const [result, setResult] = useState<StepResult>(step?.result ?? 'pending');
  const [ids, setIds] = useState<number[]>(() => step?.stages.map((s) => s.id) ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const options: StageBadge[] = mergeArchivedInUse(stageTypes, step?.stages ?? []);

  const field =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]';
  const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]';

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={step ? 'Edit step' : 'Add step'}
      subtitle="A step can carry more than one badge — tech and live coding often share a sitting."
      footer={
        <>
          {onDelete && step && (
            <button
              type="button"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              disabled={busy}
              className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {confirmDelete ? 'Delete step and its panels' : 'Delete'}
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
            onClick={() => onSave({ title: title.trim() || null, result, stageTypeIds: ids })}
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
          <span className={label}>Stages</span>
          <StageBadgePicker all={options} selected={ids} onChange={setIds} />
        </div>

        <div>
          <label className={label} htmlFor="step-title">
            Title <span className="normal-case text-[var(--muted)]/70">(optional)</span>
          </label>
          <input
            id="step-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to the badges above"
            className={field}
          />
        </div>

        <div>
          <span className={label}>Outcome</span>
          <div className="flex flex-wrap gap-1.5">
            {RESULTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResult(r)}
                aria-pressed={result === r}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  result === r
                    ? RESULT_ACTIVE[r]
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {STEP_RESULT_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}

const RESULT_ACTIVE: Record<StepResult, string> = {
  pending: 'border-[var(--border-strong)] bg-white/10 text-white',
  passed: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
  failed: 'border-red-500/50 bg-red-500/15 text-red-300',
  cancelled: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
};

function mergeArchivedInUse(types: StageType[], inUse: StageBadge[]): StageBadge[] {
  const known = new Set(types.map((t) => t.id));
  return [...types, ...inUse.filter((s) => !known.has(s.id))];
}
