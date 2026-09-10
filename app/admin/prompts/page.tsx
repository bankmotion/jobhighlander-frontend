import { fetchProfilePrompts } from '@/lib/profile-prompts.server';
import { ProfilePromptManager } from '@/app/components/profile-prompt-manager';

export const dynamic = 'force-dynamic';

export default async function ProfilePromptsPage() {
  const prompts = await fetchProfilePrompts();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Custom Prompts</h1>
      <p className="mb-5 max-w-3xl text-sm text-[var(--muted)]">
        Extra drafting guidance per profile, added to the main application prompt whenever a resume
        or cover letter is generated for it. One tab per profile you own. Edits take effect on the
        next generation.
      </p>
      <ProfilePromptManager initial={prompts} />
    </div>
  );
}
