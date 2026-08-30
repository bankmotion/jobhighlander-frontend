import Link from 'next/link';
import { fetchPresets } from '@/lib/templates';
import { fetchProfiles, fetchProfile } from '@/lib/profiles';
import { TemplatePicker } from '@/app/components/template-picker';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const [presets, usable] = await Promise.all([fetchPresets(), fetchProfiles()]);

  const profiles = usable.filter((p) => p.canEdit);
  const sharedCount = usable.length - profiles.length;

  // The summary endpoint does not carry the saved default, so each profile is
  // fetched in full. Fine at this scale — a handful of profiles per admin.
  const full = await Promise.all(profiles.map((p) => fetchProfile(p.id)));
  const defaults: Record<number, string | null> = {};
  full.forEach((p) => {
    if (p) defaults[p.id] = (p as { defaultTemplateKey?: string | null }).defaultTemplateKey ?? null;
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Resume templates</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Pick the default design for each profile you own. Every preview shows the same sample
        candidate, so what differs between them is the design.
      </p>

      {sharedCount > 0 && (
        <p className="mb-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          {sharedCount} profile{sharedCount === 1 ? '' : 's'} shared with you {sharedCount === 1 ? 'is' : 'are'}{' '}
          not listed — a default template belongs to the profile, so only its owner sets it. You can
          still choose a template for any individual resume you generate.
        </p>
      )}

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          You do not own any profiles yet.{' '}
          <Link href="/profiles" className="text-[var(--text)] underline hover:text-white">
            Create one
          </Link>{' '}
          to set its default template.
        </div>
      ) : (
        <TemplatePicker presets={presets} profiles={profiles} defaults={defaults} />
      )}
    </div>
  );
}
