import Image from 'next/image';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { getSession } from '@/lib/auth';
import { SidebarData } from '@/app/components/sidebar-data';
import { Topbar } from '@/app/components/topbar';
import { PageTransition } from '@/app/components/page-transition';

export const metadata: Metadata = {
  title: 'JobHighLander',
  description: 'Aggregated job postings scraped from across the web.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="min-h-screen">
        {session ? (
          <div className="flex min-h-screen">
            <Suspense fallback={<SidebarSkeleton />}>
              <SidebarData role={session.role} />
            </Suspense>
            <div className="flex min-w-0 flex-1 flex-col">
              <Suspense fallback={<TopbarSkeleton />}>
                <Topbar session={session} />
              </Suspense>
              <main className="flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                  <PageTransition>{children}</PageTransition>
                </div>
              </main>
            </div>
          </div>
        ) : (
          <main className="min-h-screen">
            <PageTransition>{children}</PageTransition>
          </main>
        )}
      </body>
    </html>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col md:sticky md:top-0 md:h-screen">
      <div className="flex flex-col items-center gap-2 px-5 pb-4 pt-5">
        <Image
          src="/logo.png"
          alt=""
          width={560}
          height={403}
          loading="eager"
          className="h-auto w-[150px] select-none"
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
