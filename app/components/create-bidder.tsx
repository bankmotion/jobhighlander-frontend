'use client';

import { useState } from 'react';

/**
 * Create a bidder account outright.
 *
 * The account is usable immediately — no super-admin approval. Self-registration
 * produces a pending account precisely because nobody vouched for the person;
 * here an admin has, by typing the address and setting the password, so a second
 * approval would be the same decision waiting on someone who was not part of it.
 *
 * The password is shown back once, on success. An admin has to pass it to the
 * person somehow, and a value they cannot read is one they will work around by
 * choosing something guessable.
 */
export function CreateBidder({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const tooShort = password.length > 0 && password.length < 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email.trim() || password.length < 8) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? 'Could not create that account' });
        return;
      }
      setCreated({ email: data.email, password });
      setMsg({ ok: true, text: `${data.email} can sign in now — no approval needed.` });
      setEmail('');
      setPassword('');
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
        The account works straight away — they sign in with these details, and no super admin has to
        approve it. Share the profiles you want them on below.
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
        <div className="flex-1">
          <label className="mb-1 block text-xs text-[var(--muted)]" htmlFor="cb-password">
            Password
            <span className="ml-2">at least 8 characters</span>
          </label>
          <input
            id="cb-password"
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="set a password to hand over"
            className={`w-full rounded-lg border bg-[var(--surface-2)] px-3 py-2 text-sm outline-none transition focus:border-[var(--primary)] ${
              tooShort ? 'border-amber-400/60' : 'border-[var(--border)]'
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !email.trim() || password.length < 8}
          className="jh-cta mt-auto rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60 sm:mt-[22px]"
        >
          {busy ? 'Creating…' : 'Create bidder'}
        </button>
      </form>

      {tooShort && <p className="mt-2 text-xs text-amber-300">Passwords must be 8 characters or more.</p>}

      {msg && (
        <p className={`mt-3 text-sm ${msg.ok ? 'text-green-300' : 'text-red-400'}`}>{msg.text}</p>
      )}

      {created && (
        // Shown once, so the admin can copy it out. It is not retrievable later
        // — only the hash is stored — so saying so here avoids a support round
        // trip when they close the page and come back for it.
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-[var(--muted)]">
            Credentials to pass on — shown once
          </p>
          <p className="font-mono text-[var(--text)]">{created.email}</p>
          <p className="font-mono text-[var(--text)]">{created.password}</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(`${created.email}\n${created.password}`)
                .catch(() => {});
            }}
            className="mt-2 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-white"
          >
            Copy both
          </button>
        </div>
      )}
    </section>
  );
}
