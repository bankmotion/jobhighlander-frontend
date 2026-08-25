import { getToken } from './auth';
import type { StageBadge } from './interviews';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface StageType extends StageBadge {
  sortOrder: number;
}

/** The admin listing adds how many steps wear each badge. */
export interface StageTypeWithUsage extends StageType {
  usage: number;
}

/**
 * The badge catalogue.
 *
 * `includeArchived` is what the admin screen asks for. The picker never does —
 * offering a retired badge is exactly how it comes back into circulation.
 */
export async function fetchStageTypes(includeArchived = false): Promise<StageType[]> {
  const token = await getToken();
  if (!token) return [];
  try {
    const res = await fetch(
      `${API_URL}/api/stage-types${includeArchived ? '?includeArchived=1' : ''}`,
      { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** Same call, typed for the admin screen that asked for usage counts. */
export async function fetchStageTypesWithUsage(): Promise<StageTypeWithUsage[]> {
  return (await fetchStageTypes(true)) as StageTypeWithUsage[];
}
