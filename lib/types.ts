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
