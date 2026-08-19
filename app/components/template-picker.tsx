'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Preset } from '@/lib/templates';
import type { ProfileSummary } from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = {
  classic: 'Classic',
  modern: 'Modern',
  professional: 'Professional',
  creative: 'Creative',
};

export function TemplatePicker({
  presets,
  profiles,
  defaults,
}: {
  presets: Preset[];
  profiles: ProfileSummary[];
  /** profileId -> currently saved preset key */
  defaults: Record<number, string | null>;
}) {
  const [profileId, setProfileId] = useState<number | ''>(profiles[0]?.id ?? '');
  const [selected, setSelected] = useState<Record<number, string | null>>(defaults);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = profileId ? selected[profileId] : null;

  async function setDefault(key: string) {
    if (!profileId) return;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch('/api/resumes/templates/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, templateKey: key }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? 'Could not save (' + res.status + ')');
        return;
      }
      setSelected((prev) => ({ ...prev, [profileId]: key }));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(null);
    }
  }

  if (profiles.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Create a profile first — a default template is saved per profile.
      </p>
    );
  }

  const byCategory = presets.reduce<Record<string, Preset[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Default for profile
          </span>
          <select
            value={profileId}
            onChange={(e) => setProfileId(Number(e.target.value))}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Profile #' + p.id}
              </option>
            ))}
          </select>
        </label>
        {current && (
          <p className="pb-2 text-sm text-[var(--muted)]">
            Currently <span className="font-medium text-[var(--text)]">{current}</span>
          </p>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-white">
            {CATEGORY_LABEL[category] ?? category}
            <span className="ml-2 font-normal text-[var(--muted)]">{items.length}</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((p) => {
              const isCurrent = current === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setDefault(p.key)}
                  disabled={saving !== null}
                  aria-pressed={isCurrent}
                  className={`group overflow-hidden rounded-xl border text-left transition disabled:cursor-not-allowed ${
                    isCurrent
                      ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/40'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {/* Every thumbnail shows the same fictional candidate, so what
                      varies between cards is the design and nothing else. */}
                  <div className="relative aspect-[816/1056] bg-white">
                    <Image
                      src={`/template-thumbs/${p.key}.webp`}
                      alt={`${p.name} template preview`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 20vw"
                      className="object-cover object-top"
                    />
                    {saving === p.key && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">
                        Saving…
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2">
                    <span className="truncate text-sm font-medium text-white">{p.name}</span>
                    {isCurrent ? (
                      <span className="shrink-0 rounded bg-[var(--primary)]/20 px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                        Default
                      </span>
                    ) : (
                      p.atsSafe && (
                        <span
                          title="Single column, no tables, no icons — survives text extraction"
                          className="shrink-0 rounded bg-green-500/15 px-1.5 py-0.5 text-[11px] text-green-300"
                        >
                          ATS
                        </span>
                      )
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="mt-2 max-w-2xl text-xs text-[var(--muted)]">
        The ATS mark means the layout is single-column with no tables, icons or letter-spacing —
        the things measured to break text extraction. It is not a guarantee: real applicant
        tracking systems use several different parsers and they disagree with each other.
      </p>
    </div>
  );
}
