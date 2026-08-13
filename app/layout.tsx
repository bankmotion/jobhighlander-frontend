import type { Metadata } from 'next';
import './globals.css';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/app/components/sidebar';
import { Topbar } from '@/app/components/topbar';

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
            <Sidebar role={session.role} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar session={session} />
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
