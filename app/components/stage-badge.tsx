'use client';

import type { StageBadge } from '@/lib/interviews';

export function StageChip({
  stage,
  size = 'sm',
  onRemove,
}: {
  stage: StageBadge;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}) {
  const md = size === 'md';
  return (
    <span
      // Archived types keep rendering on steps that already wear them — the
      // round happened, and retiring the badge afterwards must not rewrite
      // history. The dimming says the badge is no longer offered.
      title={stage.archived ? `${stage.name} (retired)` : stage.name}
      style={{
        backgroundColor: `${stage.color}1f`,
        color: stage.color,
        borderColor: `${stage.color}59`,
      }}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${
        md ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${stage.archived ? 'opacity-60' : ''}`}
    >
      {stage.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${stage.name}`}
          className="-mr-0.5 ml-0.5 rounded-full px-1 leading-none opacity-70 transition hover:bg-black/20 hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function StageBadgePicker({
  all,
  selected,
  onChange,
}: {
  all: StageBadge[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const set = new Set(selected);

  function toggle(id: number) {
    // Order matters — the API stores it — so a re-selected badge goes to the
    // end rather than back to wherever it used to sit.
    onChange(set.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  if (all.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No stages defined yet. A super admin can add them under Admin → Interview stages.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((s) => {
        const on = set.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            aria-pressed={on}
            style={
              on
                ? { backgroundColor: `${s.color}26`, color: s.color, borderColor: `${s.color}80` }
                : undefined
            }
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
              on
                ? ''
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
