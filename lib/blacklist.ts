/**
 * Company blacklist client.
 *
 * Browser-safe half: types plus mutations, all against the Next proxy routes
 * under /api/blacklist on relative URLs, which attach the auth token
 * server-side. Nothing here may import `getToken` — that reaches next/headers
 * and would fail the build for every client component importing this file.
 * The server-side reader lives in blacklist.server.ts.
 */

/**
 * Which list caught a posting's employer.
 *
 * `all` is the stronger statement and wins when both apply, so the badge can
 * say whether this is a decision for everyone or just for this profile.
 */
export type BlacklistScope = 'all' | 'profile';

export interface BlacklistEntry {
  id: number;
  company: string;
  companyKey: string;
  /** null = every profile. */
  profileId: number | null;
  scope: BlacklistScope;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; email: string };
  profile: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

/** Display name for an entry's scope, for the table's "Applies to" column. */
export function scopeLabel(e: BlacklistEntry): string {
  if (e.profileId === null) return 'All profiles';
  const p = e.profile;
  if (!p) return `Profile #${e.profileId}`;
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  return name || p.email || `Profile #${p.id}`;
}

// ── browser side: relative URLs, token attached by the proxy route ──────────

/** Reload the list from the browser after a change. */
export async function loadBlacklist(profileId?: number): Promise<BlacklistEntry[]> {
  try {
    const res = await fetch(`/api/blacklist${profileId ? `?profileId=${profileId}` : ''}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

/** `scope` is 'all' or the profile ids to add it for. */
export async function addBlacklistEntry(
  company: string,
  scope: 'all' | number[],
): Promise<{ ok: boolean; added?: number; skipped?: number; error?: string }> {
  try {
    const res = await fetch('/api/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, scope }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? 'Could not add that company' };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: 'Could not add that company' };
  }
}

export async function updateBlacklistEntry(
  id: number,
  patch: { company?: string; profileId?: number | null },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/blacklist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? 'Could not save that change' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save that change' };
  }
}

export async function deleteBlacklistEntry(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/blacklist/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? 'Could not remove that entry' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not remove that entry' };
  }
}
