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

export interface Education {
  id?: number;
  university: string | null;
  location: string | null;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface Profile {
  id: number;
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
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  location: string | null;
  updatedAt: string;
  _count: { workExperiences: number; educations: number };
}
