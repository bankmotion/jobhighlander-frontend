'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Preset, BackgroundDef } from '@/lib/templates';
import type { ProfileSummary } from '@/lib/types';
import { Toast, useToast } from './toast';

const CATEGORY_LABEL: Record<string, string> = {
  classic: 'Classic',
  modern: 'Modern',
  professional: 'Professional',
  creative: 'Creative',
};

const FONT_LABEL: Record<string, string> = {
  'serif-classic': 'Georgia',
  'serif-sans': 'Georgia / Helvetica',
  'sans-modern': 'Helvetica',
  'sans-humanist': 'Segoe UI',
  'slab-sans': 'Palatino / Helvetica',
};

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M20 6 L9 17 L4 12" />
    </svg>
  );
}

/** Plain first, loudest last -- the same order the generator's picker uses. */
const BG_GROUPS = ['plain', 'lines', 'dots', 'geometric', 'accent'] as const;
const BG_LABEL: Record<string, string> = {
  plain: 'Plain',
  lines: 'Lines',
  dots: 'Dots',
  geometric: 'Geometric',
  accent: 'Accents',
};

export function TemplatePicker({
  presets,
  profiles,
  defaults,
  backgrounds,
  backgroundDefaults,
}: {
  presets: Preset[];
  profiles: ProfileSummary[];
  defaults: Record<number, string | null>;
  backgrounds: BackgroundDef[];
  backgroundDefaults: Record<number, string | null>;
}) {
  const [profileId, setProfileId] = useState<number | ''>(profiles[0]?.id ?? '');
  const [selected, setSelected] = useState<Record<number, string | null>>(defaults);
  const [selectedBg, setSelectedBg] = useState<Record<number, string | null>>(backgroundDefaults);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preset | null>(null);
  // Two grids of page-shaped thumbnails would be indistinguishable side by
  // side, and stacking them buries whichever comes second. Tabs keep one
  // decision on screen at a time, sharing the profile selector above.
  const [tab, setTab] = useState<'templates' | 'backgrounds'>('templates');
  const [bgPreview, setBgPreview] = useState<BackgroundDef | null>(null);
  const { toast, show, dismiss } = useToast();

  const current = profileId ? selected[profileId] : null;
  // Null means the profile never chose one, which renders plain -- so the
  // control shows 'none' without writing that choice until someone picks.
  const currentBg = profileId ? selectedBg[profileId] : null;

  // Escape closes the preview — expected of any modal, and the only way out
  // for someone not using a mouse.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(null);
        setBgPreview(null);
      }
    };
    window.addEventListener('keydown', onKey);
    // Stop the page behind the modal scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [preview]);

  function profileName(id: number | '') {
    const p = profiles.find((x) => x.id === id);
    if (!p) return 'this profile';
    return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
  }

  /**
   * Save this profile's default background.
   *
   * No preview alongside it, unlike the template grid: a background is a wash
   * behind the text, and it is the template thumbnails that show what a resume
   * actually looks like. The per-resume picker in the generator previews the
   * real thing against real content, which is the place that judgement is
   * better made.
   */
  async function setDefaultBackground(key: string) {
    if (!profileId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/resumes/backgrounds/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, background: key }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        show(d?.error ?? `Could not save (${res.status})`, 'error');
        return;
      }
      setSelectedBg((prev) => ({ ...prev, [profileId]: key }));
      const name = backgrounds.find((b) => b.key === key)?.name ?? key;
      show(`${name} is now the background for ${profileName(profileId)}`);
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(key: string) {
    if (!profileId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/resumes/templates/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, templateKey: key }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        show(d?.error ?? `Could not save (${res.status})`, 'error');
        return;
      }
      setSelected((prev) => ({ ...prev, [profileId]: key }));
      const name = presets.find((p) => p.key === key)?.name ?? key;
      show(`${name} is now the default for ${profileName(profileId)}`);
      setPreview(null);
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setSaving(false);
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

        {/* Follows the tab, so it always names the thing being chosen below
            rather than the other one. */}
        <p className="pb-2 text-sm text-[var(--muted)]">
          Currently{' '}
          <span className="font-medium text-[var(--text)]">
            {tab === 'templates'
              ? (presets.find((p) => p.key === current)?.name ?? current ?? 'the default template')
              : (backgrounds.find((b) => b.key === (currentBg ?? 'none'))?.name ?? 'No Background')}
          </span>
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-[var(--border)]">
        {(['templates', 'backgrounds'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-[var(--primary)] text-white'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {t}
            <span className="ml-2 font-normal text-[var(--muted)]">
              {t === 'templates' ? presets.length : backgrounds.length}
            </span>
          </button>
        ))}
      </div>

      {tab === 'templates' &&
        Object.entries(byCategory).map(([category, items]) => (
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
                  onClick={() => setPreview(p)}
                  className={`group overflow-hidden rounded-xl border text-left transition ${
                    isCurrent
                      ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/40'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="relative aspect-[816/1056] bg-white">
                    <Image
                      src={`/template-thumbs/${p.key}.webp`}
                      alt={`${p.name} template preview`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 20vw"
                      className="object-cover object-top"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      Preview
                    </span>

                    {!isCurrent && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Use ${p.name} for this profile`}
                        title={`Use ${p.name} for this profile`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!saving && profileId) void setDefault(p.key);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (!saving && profileId) void setDefault(p.key);
                        }}
                        className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 text-[var(--muted)] shadow-lg transition hover:scale-110 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                      >
                        <IconCheck />
                      </span>
                    )}

                    {isCurrent && (
                      <span
                        title="Default template for this profile"
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white shadow-lg ring-2 ring-white/70"
                      >
                        <span aria-hidden>✓</span>
                        <span className="sr-only">Default template</span>
                      </span>
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

      {tab === 'backgrounds' && (
        <div>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Every preview below uses the SAME template, so what differs between them is the
            background alone. Choosing one saves it for this profile; an individual resume can
            still override it when you generate.
          </p>
          {BG_GROUPS.map((cat) => {
            const items = backgrounds.filter((b) => b.category === cat);
            if (!items.length) return null;
            return (
              <section key={cat} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-white">
                  {BG_LABEL[cat]}
                  <span className="ml-2 font-normal text-[var(--muted)]">{items.length}</span>
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((b) => {
                    const isCurrent = (currentBg ?? 'none') === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setBgPreview(b)}
                        title={b.description}
                        className={`group overflow-hidden rounded-xl border text-left transition disabled:opacity-50 ${
                          isCurrent
                            ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/40'
                            : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="relative aspect-[816/1056] bg-white">
                          <Image
                            src={`/background-thumbs/${b.key}.webp`}
                            alt={`${b.name} background preview`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 20vw"
                            className="object-cover object-top"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            Preview
                          </span>

                          {/* Picking lives on its own control, not on the card.
                              The card is a preview -- one click should not
                              quietly change the profile's default while
                              someone is still looking through the options. */}
                          {!isCurrent && (
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={`Use ${b.name} for this profile`}
                              title={`Use ${b.name} for this profile`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!saving && profileId) void setDefaultBackground(b.key);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') return;
                                e.preventDefault();
                                e.stopPropagation();
                                if (!saving && profileId) void setDefaultBackground(b.key);
                              }}
                              className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 text-[var(--muted)] shadow-lg transition hover:scale-110 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                            >
                              <IconCheck />
                            </span>
                          )}
                          {isCurrent && (
                            <span
                              title="Default background for this profile"
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white shadow-lg ring-2 ring-white/70"
                            >
                              <span aria-hidden>✓</span>
                              <span className="sr-only">Default background</span>
                            </span>
                          )}
                        </div>
                        <div className="bg-[var(--surface)] px-3 py-2">
                          <span className="block truncate text-sm font-medium text-white">{b.name}</span>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {isCurrent ? 'Current default' : b.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {bgPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${bgPreview.name} preview`}
          onClick={() => setBgPreview(null)}
          className="fixed inset-0 z-50 flex overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="m-auto w-full max-w-4xl overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white">{bgPreview.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{bgPreview.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setBgPreview(null)}
                aria-label="Close preview"
                className="rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted)] transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-[var(--surface-2)] p-4">
              {/* Unoptimised and at natural size: these are fine textures, and
                  Next's resizing softens exactly the detail being judged. */}
              <Image
                src={`/background-thumbs/${bgPreview.key}.webp`}
                alt={`${bgPreview.name} background, full page`}
                width={816}
                height={1056}
                // Deliberately unoptimised: these are fine textures, and the
                // resampling softens exactly the detail being judged here.
                unoptimized
                className="mx-auto block h-auto w-full max-w-2xl rounded-lg border border-[var(--border)] bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
              <button
                type="button"
                onClick={() => setBgPreview(null)}
                className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition hover:text-white"
              >
                Close
              </button>
              {(currentBg ?? 'none') === bgPreview.key ? (
                <span className="text-sm text-[var(--muted)]">Current default</span>
              ) : (
                <button
                  type="button"
                  disabled={saving || !profileId}
                  onClick={() => {
                    void setDefaultBackground(bgPreview.key);
                    setBgPreview(null);
                  }}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Use this background'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${preview.name} preview`}
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setPreview(null)}
        >
          <div
            // Clicks inside must not fall through to the backdrop's close.
            onClick={(e) => e.stopPropagation()}
            className="m-auto w-full max-w-5xl overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white">{preview.name}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                  <span>{CATEGORY_LABEL[preview.category] ?? preview.category}</span>
                  <span aria-hidden>·</span>
                  <span>{FONT_LABEL[preview.fontPair] ?? preview.fontPair}</span>
                  <span aria-hidden>·</span>
                  <span className="capitalize">{preview.density}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full border border-white/20"
                      style={{ background: preview.accent }}
                    />
                    {preview.accent}
                  </span>
                  {preview.atsSafe && (
                    <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-green-300">
                      ATS-safe
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-[var(--muted)] transition hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto bg-[var(--bg)] p-4">
              <div className="relative mx-auto aspect-[816/1056] w-full max-w-[640px] bg-white shadow-lg">
                <Image
                  src={`/template-thumbs/${preview.key}.webp`}
                  alt={`${preview.name} full preview`}
                  fill
                  sizes="640px"
                  className="object-contain"
                  priority
                />
                {current === preview.key && (
                  <span
                    title="Default template for this profile"
                    className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-2 ring-white/70"
                  >
                    <span aria-hidden>✓</span> Default
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
              <p className="text-xs text-[var(--muted)]">
                Sample content — your own resume renders with this design.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-white/5"
                >
                  Close
                </button>
                {current === preview.key ? (
                  <span className="rounded-lg bg-[var(--primary)]/15 px-4 py-2 text-sm font-medium text-[var(--primary)]">
                    Current default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDefault(preview.key)}
                    disabled={saving}
                    className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : `Set as default for ${profileName(profileId)}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />

      <p className="mt-2 max-w-2xl text-xs text-[var(--muted)]">
        The ATS mark means the layout is single-column with no tables, icons or letter-spacing —
        the things measured to break text extraction. It is not a guarantee: real applicant
        tracking systems use several different parsers and they disagree with each other.
      </p>
    </div>
  );
}
