'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GrantProfile, GrantsData } from '@/lib/grants';
import { Toast, useToast } from './toast';

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * What each profile is approved for.
 *
 * One column per feature, driven entirely by the registry the server sends —
 * adding a gated feature server-side makes a column appear here with no change
 * to this file. That is the whole reason the grant is keyed on a string rather
 * than on a job site.
 *
 * Every profile is listed, not only the approved ones: "who could have this and
 * does not" is asked as often as the reverse, and a list of grants cannot
 * answer it.
 */
export function GrantsManager({ initial }: { initial: GrantsData }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();

  const key = (profileId: number, feature: string) => `${profileId}:${feature}`;

  async function toggle(profile: GrantProfile, feature: string, granted: boolean) {
    const k = key(profile.id, feature);
    if (busy) return;
    setBusy(k);
    try {
      const res = await fetch('/api/admin/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The desired end state, not a flip: safe to retry, where a toggle
        // would undo itself on a double submit.
        body: JSON.stringify({ profileId: profile.id, feature, granted }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        show(d?.error ?? `Could not update (${res.status})`, 'error');
        return;
      }
      setData((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id !== profile.id
            ? p
            : {
                ...p,
                granted: granted
                  ? [...p.granted, { feature, grantedBy: 'you', createdAt: new Date().toISOString() }]
                  : p.granted.filter((g) => g.feature !== feature),
              },
        ),
      }));
      const label = data.features.find((f) => f.key === feature)?.label ?? feature;
      show(granted ? `${profile.name}: ${label} approved` : `${profile.name}: ${label} withdrawn`);
      // The job list is built server-side against these grants, so it has to be
      // rebuilt for the change to show up there.
      router.refresh();
    } catch {
      show('Could not reach the server.', 'error');
    } finally {
      setBusy(null);
    }
  }

  if (data.features.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
        Nothing is gated right now, so there is nothing to approve.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] align-top">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Profile
              </th>
              {data.features.map((f) => (
                <th key={f.key} className="px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]">
                    {f.label}
                  </div>
                  {/* The description is on the page, not in a tooltip: an admin
                      deciding whether to grant something should not have to
                      hover to find out what it does. */}
                  <p className="mt-1 max-w-[16rem] text-[11px] font-normal normal-case leading-snug text-[var(--muted)]">
                    {f.description}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.profiles.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-white">{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">owner: {p.owner}</div>
                </td>
                {data.features.map((f) => {
                  const grant = p.granted.find((g) => g.feature === f.key);
                  const on = Boolean(grant);
                  const k = key(p.id, f.key);
                  return (
                    <td key={f.key} className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => void toggle(p, f.key, !on)}
                        disabled={busy !== null}
                        title={
                          on
                            ? `Granted ${when(grant!.createdAt)} by ${grant!.grantedBy}`
                            : 'Not approved'
                        }
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                          on
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:border-emerald-400'
                            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-white'
                        }`}
                      >
                        {busy === k ? 'Saving…' : on ? 'Approved' : 'Not approved'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.profiles.length === 0 && (
        <p className="mt-4 text-sm text-[var(--muted)]">There are no profiles yet.</p>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
