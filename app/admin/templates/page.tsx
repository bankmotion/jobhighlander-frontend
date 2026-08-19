import { fetchPresets } from '@/lib/templates';
import { fetchProfiles, fetchProfile } from '@/lib/profiles';
import { TemplatePicker } from '@/app/components/template-picker';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const [presets, profiles] = await Promise.all([fetchPresets(), fetchProfiles()]);

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
        Pick the default design for each profile. Every preview shows the same sample candidate, so
        what differs between them is the design.
      </p>
      <TemplatePicker presets={presets} profiles={profiles} defaults={defaults} />
    </div>
  );
}
