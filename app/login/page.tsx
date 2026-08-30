'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const onCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) {
        setError('Google did not return a credential. Please try again.');
        return;
      }
      setError(null);
      setPending(false);
      setLoading(true);
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // 403 is the approval gate: the account exists but a super admin has
          // not granted it a role yet. That is a normal first-time state, not
          // an error the user can fix by retrying.
          if (res.status === 403) setPending(true);
          else setError(data.error ?? 'Sign-in failed');
          return;
        }
        router.replace('/');
        router.refresh();
      } catch {
        setError('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!scriptReady || !CLIENT_ID || !buttonRef.current) return;
    const gis = window.google?.accounts?.id;
    if (!gis) return;
    gis.initialize({ client_id: CLIENT_ID, callback: onCredential });
    gis.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 320,
    });
  }, [scriptReady, onCredential]);

  if (pending) {
    return (
      <AuthShell title="Almost there" subtitle="Your account was created.">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          Your account is waiting for a super admin to approve it. You will be able
          to sign in as soon as that happens.
        </div>
        <button
          onClick={() => setPending(false)}
          className="mt-4 w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="Access the JobHighLander board.">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      {!CLIENT_ID ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Google sign-in is not configured. Set{' '}
          <code className="font-mono">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and restart
          the app.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div ref={buttonRef} className="min-h-[44px]" />
          {!scriptReady && (
            <p className="text-sm text-[var(--muted)]">Loading Google sign-in…</p>
          )}
          {loading && <p className="text-sm text-[var(--muted)]">Signing in…</p>}
        </div>
      )}

      {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

      <p className="mt-5 text-center text-xs text-[var(--muted)]">
        First time here? Signing in creates your account, and a super admin approves
        it before you get access.
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center justify-center">
          <Image
            src="/logo.png"
            alt="JobHighLander"
            width={560}
            height={403}
            preload
            className="h-auto w-[188px] select-none"
          />
          <span className="mt-2 text-lg font-semibold tracking-tight text-white">JobHighLander</span>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
          <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mb-5 mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
