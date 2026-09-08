'use client';

import { useState } from 'react';

/**
 * Create a bidder account outright.
 *
 * The account is usable immediately — no super-admin approval. Self-registration
 * produces a pending account precisely because nobody vouched for the person;
 * here an admin has, by naming the address, so a second approval would be the
 * same decision waiting on someone who was not part of it.
 *
 * Email only, no password: sign-in on this app is Google-only. Creating the row
 * ahead of time is the whole mechanism — the bidder's first Google sign-in finds
 * an account already marked `bidder` instead of creating a `guest` that waits
 * for approval.
 */
export function CreateBidder({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? 'Could not create that account' });
        return;
      }
      setMsg({
        ok: true,
        text: `${data.email} can sign in with Google now — no approval needed.`,
      });
      setEmail('');
      onCreated?.();
    } catch {
      setMsg({ ok: false, text: 'Could not create that account' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold text-white">Create a bidder account</h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        The account works straight away — they sign in with Google using this address, and no super
        admin has to approve it. Share the profiles you want them on below.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="cb-email">
            Email
          </label>
          <input
            id="cb-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="bidder@example.com"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)]"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="jh-cta mt-auto rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60 sm:mt-[22px]"
        >
          {busy ? 'Creating…' : 'Create bidder'}
        </button>
      </form>

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? 'text-green-300' : 'text-red-400'}`}>{msg.text}</p>
      )}

    </section>
  );
}
