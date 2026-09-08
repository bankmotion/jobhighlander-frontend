import type { Role } from './session';

export interface Job {
  id: number;
  site: string;
  siteJobId: string;
  title: string;
  description: string;
  jobUrl: string;
  applyUrl: string | null;
  company: string | null;
  companyUrl: string | null;
  jobType: string | null;
  remote: boolean;
  location: string | null;
  salary: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /// How many profiles have applied to this posting, across every profile —
  /// not just the one being viewed as. Optional because endpoints other than
  /// the job list do not compute it.
  appliedCount?: number;
  /// True when this employer is blacklisted FOR THE PROFILE being viewed as.
  /// Nothing is flagged without a profile selected, because every entry belongs
  /// to one. A FLAG only — the job is never hidden.
  blacklisted?: boolean;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
  // Highest id matching the current filters, identical on every page. The job
  // list polls against it for new arrivals; the highest id on the page being
  // read is lower on anything past page 1 and would report the wrong count.
  latestId?: number;
}

export interface JobFilters {
  sites: string[];
  locations: string[];
}

export interface Keyword {
  id: number;
  word: string;
  createdAt: string;
}

// ── Profiles (admin-managed candidate/bidding profiles) ──
// Date fields arrive as ISO strings (@db.Date → 'YYYY-MM-DDT00:00:00.000Z') or null.
export interface WorkExperience {
  id?: number;
  company: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
}

export type DatePrecision = 'year' | 'month';

export interface Education {
  id?: number;
  university: string | null;
  location: string | null;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
  datePrecision?: DatePrecision;
}

export interface ProfileOwner {
  id: number;
  email: string;
  /// Present on the profile LIST, where the members panel names each person's
  /// role. Optional because other endpoints return the owner without it.
  role?: Role;
}

export interface Profile {
  id: number;
  ownerId: number;
  owner: ProfileOwner;
  canEdit: boolean;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  linkedin: string | null;
  location: string | null;
  workExperiences: WorkExperience[];
  educations: Education[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Someone invited to a profile.
 *
 * `pending` is carried alongside `accepted` on purpose: "invited but has not
 * answered" is a different fact from "has access", and an owner chasing a
 * bidder needs to tell them apart rather than wonder why the person they
 * invited is missing.
 */
export interface ProfileMember {
  id: number;
  status: 'pending' | 'accepted';
  createdAt: string;
  respondedAt: string | null;
  user: { id: number; email: string; role: Role };
  invitedBy: { id: number; email: string };
}

export interface ProfileSummary {
  id: number;
  ownerId: number;
  owner: ProfileOwner;
  canEdit: boolean;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  updatedAt: string;
  _count: { workExperiences: number; educations: number };
  /// Everyone invited to this profile, excluding declined. The OWNER is not in
  /// here — they are `owner`, and they are a member by definition.
  invitations: ProfileMember[];
}

// ── Profile invitations ──
// An owner invites another user to USE one of their profiles. Access starts
// only once the invitee accepts; until then the profile stays out of their list.
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface InvitedUser {
  id: number;
  email: string;
  role: Role;
}

export interface ProfileInvitation {
  id: number;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
  user: InvitedUser;
}

export interface SharedProfile {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  owner: ProfileOwner;
  invitations: ProfileInvitation[];
}

export interface ReceivedInvitation {
  id: number;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
  profile: {
    id: number;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    location: string | null;
    owner: ProfileOwner;
  };
  invitedBy: ProfileOwner;
}
