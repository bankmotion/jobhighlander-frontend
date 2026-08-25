import { fetchStageTypesWithUsage } from '@/lib/stage-types';
import { StageTypeManager } from '@/app/components/stage-type-manager';

export const dynamic = 'force-dynamic';

export default async function StageTypesPage() {
  const types = await fetchStageTypesWithUsage();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Interview stages</h1>
      <p className="mb-5 max-w-2xl text-sm text-[var(--muted)]">
        The badges a step can wear on an interview timeline. Every company runs a different loop, so
        add whatever yours actually use — order here is the order the picker shows.
      </p>
      <div className="max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <StageTypeManager initial={types} />
      </div>
    </div>
  );
}
