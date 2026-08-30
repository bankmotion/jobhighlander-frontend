import { getToken } from './auth';
import type { StageType, StageTypeWithUsage } from './stage-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

export async function fetchStageTypesWithUsage(): Promise<StageTypeWithUsage[]> {
  return (await fetchStageTypes(true)) as StageTypeWithUsage[];
}
