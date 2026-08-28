import Image from 'next/image';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { getSession } from '@/lib/auth';
import { SidebarData } from '@/app/components/sidebar-data';
import { Topbar } from '@/app/components/topbar';

export const metadata: Metadata = {
  title: 'JobHighLander',
  description: 'Aggregated job postings scraped from across the web.',
};

/**
 * The shell. Only the session is awaited here — it comes from a cookie, so it
 * costs nothing and decides whether there is a shell at all.
 *
 * The nav and the inbox each fetch from the backend, and both do it INSIDE
 * their own Suspense boundary rather than in this function. Awaiting either
 * here would hold back the entire page, including the route's own `loading.tsx`
 * skeleton, behind a round trip — the one thing a loading state exists to
 * prevent.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-screen">
        {session ? (
          <div className="flex min-h-screen">
            {/* Also the boundary `useSearchParams` needs: the sidebar reads
                `?profile=` to highlight the active job list. */}
            <Suspense fallback={<SidebarSkeleton />}>
              <SidebarData role={session.role} />
            </Suspense>
            <div className="flex min-w-0 flex-1 flex-col">
              <Suspense fallback={<TopbarSkeleton />}>
                <Topbar session={session} />
              </Suspense>
              <main className="flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">{children}</div>
              </main>
            </div>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}

/** Holds the sidebar's column so its arrival cannot shift the page sideways. */
function SidebarSkeleton() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col md:sticky md:top-0 md:h-screen">
      <div className="flex items-center gap-2 px-5 py-5">
        {/* The mark, not a lettermark: the full logo is illustration and
            turns to mush below ~64px, while the JOB knockout stays legible
            down to 16px. Large art is used on the sign-in screen instead. */}
        <Image
          src="/logo-job.png"
          alt=""
          width={32}
          height={32}
          loading="eager"
          className="h-8 w-8 rounded-lg bg-white/[0.06] object-contain p-1 ring-1 ring-inset ring-white/10"
        />
        <span className="text-[15px] font-semibold tracking-tight">JobHighLander</span>
      </div>
      <div className="space-y-2 px-3 py-2" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-[var(--surface-2)]" />
        ))}
      </div>
    </aside>
  );
}

/** Same height as the real header, so the page below it never jumps. */
function TopbarSkeleton() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <span className="text-lg font-semibold tracking-tight md:hidden">
          Job<span className="text-[var(--primary)]">HighLander</span>
        </span>
        <div className="ml-auto flex items-center gap-3" aria-hidden>
          <div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--surface-2)]" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-[var(--surface-2)]" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--surface-2)]" />
        </div>
      </div>
    </header>
  );
}
