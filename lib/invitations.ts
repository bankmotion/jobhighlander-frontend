import type { InvitationStatus, ReceivedInvitation } from './types';

/** Display name for the profile an invitation is about. */
export function invitationProfileName(inv: ReceivedInvitation): string {
  const p = inv.profile;
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || `Profile #${p.id}`;
}

export type RespondResult = { ok: true } | { ok: false; error: string };

/**
 * Accept or decline an invitation from the browser.
 *
 * Shared by the Profiles page and the Inbox because both offer the same two
 * buttons; only what they do with the result differs. Errors come back as a
 * value rather than a throw so each caller can surface them in its own toast.
 */
export async function respondToInvitation(
  id: number,
  status: Exclude<InvitationStatus, 'pending'>,
): Promise<RespondResult> {
  try {
    const res = await fetch(`/api/invitations/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, error: data?.error ?? `Could not answer the invitation (${res.status})` };
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
}
