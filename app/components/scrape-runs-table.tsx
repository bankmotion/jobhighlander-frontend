'use client';

import { useRouter } from 'next/navigation';
import type { ScrapeRun } from '@/lib/scrape-runs';

const STATUS: Record<string, string> = {
  running: 'bg-blue-500/15 text-blue-300',
  success: 'bg-green-500/15 text-green-300',
  failed: 'bg-red-500/15 text-red-300',
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duration(started: string, finished: string | null): string {
  if (!finished) return '—';
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
}

export function ScrapeRunsTable({ runs }: { runs: ScrapeRun[] }) {
  const router = useRouter();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          {runs.length} recent run{runs.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => router.refresh()}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--border-strong)]"
        >
          ↻ Refresh
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          No scrape runs logged yet. Run a scraper (e.g. <code>python main.py all</code>) and it'll show here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2 pr-4 font-medium">Site</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Started</th>
                <th className="pb-2 pr-4 font-medium">Finished</th>
                <th className="pb-2 pr-4 font-medium">Duration</th>
                <th className="pb-2 pr-4 text-right font-medium">Found</th>
                <th className="pb-2 pr-4 text-right font-medium">New</th>
                <th className="pb-2 pr-4 text-right font-medium">Updated</th>
                <th className="pb-2 text-right font-medium">Skipped</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const found = r.inserted + r.updated + r.unchanged;
                return (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="py-2.5 pr-4 font-medium text-white">{r.site}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        title={r.error ?? undefined}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[r.status] ?? 'bg-[var(--surface-2)] text-[var(--muted)]'}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{fmt(r.startedAt)}</td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{fmt(r.finishedAt)}</td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{duration(r.startedAt, r.finishedAt)}</td>
                    <td className="py-2.5 pr-4 text-right font-medium text-white">{found}</td>
                    <td className="py-2.5 pr-4 text-right text-green-300">{r.inserted}</td>
                    <td className="py-2.5 pr-4 text-right text-[var(--text)]">{r.updated}</td>
                    <td className="py-2.5 text-right text-amber-300">{r.skipped}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
