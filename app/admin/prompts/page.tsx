import { fetchPrompts } from '@/lib/prompts';
import { PromptManager } from '@/app/components/prompt-manager';

export const dynamic = 'force-dynamic';

export default async function PromptsPage() {
  const prompts = await fetchPrompts();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Prompts</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        The instructions sent to the model for each generator. Edits take effect on the next
        generation.
      </p>
      <PromptManager initial={prompts} />
    </div>
  );
}
