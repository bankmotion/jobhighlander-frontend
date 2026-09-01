import type { AppliedRow } from './applied';

// Mirrors the super-admin oversight shape in
// backend/src/services/stats.service.ts. Kept separate from `stats.ts` because
// that file describes one person's own performance, and this one describes
// everyone's — the two answer different questions and should not be conflated.

// One member's activity ON ONE PROFILE. The same person appears once per
// profile they belong to: "quiet here, busy there" is the point of the view.
export interface ProfileMemberStats {
  userId: number;
  email: string;
  role: string;
  isOwner: boolean;
  applications: number;
  interviews: number;
  offers: number;
  accepted: number;
  rejected: number;
  discarded: number;
  companies: number;
  activeInterviews: number;
  rates: { interview: number; offer: number; accepted: number };
  lastBidAt: string | null;
}

export interface ProfileBidRow {
  profileId: number;
  name: string;
  owner: { id: number; email: string };
  memberCount: number;
  activeBidders: number;
  totals: {
    applications: number;
    interviews: number;
    offers: number;
    accepted: number;
    rejected: number;
    discarded: number;
    companies: number;
    activeInterviews: number;
  };
  rates: { interview: number; offer: number; accepted: number };
  lastBidAt: string | null;
  members: ProfileMemberStats[];
}

// One person aggregated across ALL profiles they belong to.
export interface TeamBidder {
  userId: number;
  email: string;
  role: string;
  profiles: number;
  applications: number;
  interviews: number;
  offers: number;
  accepted: number;
  rates: { interview: number; offer: number; accepted: number };
}

export interface TeamBidPerformance {
  range: { days: number; from: string; to: string };
  totals: {
    profiles: number;
    members: number;
    activeBidders: number;
    applications: number;
    interviews: number;
    offers: number;
    accepted: number;
    rejected: number;
    discarded: number;
    companies: number;
    activeInterviews: number;
  };
  rates: { interview: number; offer: number; accepted: number };
  daily: { date: string; applications: number; interviews: number }[];
  bySite: { site: string; applications: number; interviews: number; rate: number }[];
  byBidder: TeamBidder[];
  profiles: ProfileBidRow[];
  applied: AppliedRow[];
}

export const ROLE_TONE: Record<string, string> = {
  super_admin: 'bg-purple-500/15 text-purple-300',
  admin: 'bg-blue-500/15 text-blue-300',
  bidder: 'bg-green-500/15 text-green-300',
  guest: 'bg-amber-500/15 text-amber-300',
};

// "never" rather than a dash: the distinction between "has not bid in this
// window" and "has never bid at all" is the one a reviewer actually acts on.
export function lastBidLabel(iso: string | null): string {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}
