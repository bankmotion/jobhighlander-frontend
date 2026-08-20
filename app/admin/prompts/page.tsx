import { fetchPrompts } from '@/lib/prompts';
import { PromptManager } from '@/app/components/prompt-manager';

export const dynamic = 'force-dynamic';

/**
 * Super-admin only, and deliberately not open to admins: a prompt decides what
 * every generated document says, on every profile in the app — including
 * profiles its editor was only invited to. That is a wider blast radius than
 * anything else an admin touches, so it sits with scraper config.
 */
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
