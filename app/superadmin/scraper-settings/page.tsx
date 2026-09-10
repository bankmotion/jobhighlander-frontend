import { fetchScraperSettings } from '@/lib/scraper-settings';
import { ScraperSettingsForm } from '@/app/components/scraper-settings-form';

export const dynamic = 'force-dynamic';

export default async function ScraperSettingsPage() {
  const settings = await fetchScraperSettings().catch(() => []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Scraper settings</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Search/filter URLs, enable toggles, and limits — stored in the database and applied on the next scrape.
      </p>
      <ScraperSettingsForm initial={settings} />
    </div>
  );
}
