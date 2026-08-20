import { fetchMyInvitations } from '@/lib/profiles';
import { InboxList } from '@/app/components/inbox-list';

export const dynamic = 'force-dynamic';

/**
 * Every invitation addressed to the signed-in user, answered or not.
 *
 * The Profiles page also prompts for the pending ones, because that is where a
 * newly accepted profile appears. This page is the full history — including the
 * declined ones, so a user can see what they turned down.
 */
export default async function InboxPage() {
  const invitations = await fetchMyInvitations();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Inbox</h1>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Invitations to use other people’s candidate profiles. Accepting one adds it to your
        Profiles page as view-only.
      </p>
      <InboxList initial={invitations} />
    </div>
  );
}
