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

/** How precise an education entry's dates are. */
export type DatePrecision = 'year' | 'month';

export interface Education {
  id?: number;
  university: string | null;
  location: string | null;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
  /**
   * Whether the dates mean a year or a month. Optional on the way IN because a
   * profile saved before this existed has no value for it; the API defaults
   * those to 'month', which is how they were entered.
   */
  datePrecision?: DatePrecision;
}

/** The account a profile belongs to, as returned alongside every profile. */
export interface ProfileOwner {
  id: number;
  email: string;
}

export interface Profile {
  id: number;
  ownerId: number;
  owner: ProfileOwner;
  /**
   * Whether the CURRENT user may edit this profile — true only for its owner.
   * Comes from the API rather than being derived here so one rule decides it.
   */
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

/** One invitation as the OWNER sees it — who it went to and what they said. */
export interface ProfileInvitation {
  id: number;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
  user: InvitedUser;
}

/** A profile the caller owns, with everyone it is shared with. */
export interface SharedProfile {
  id: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  owner: ProfileOwner;
  invitations: ProfileInvitation[];
}

/** One invitation as the INVITEE sees it — which profile, and from whom. */
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
