// Mirrors AppliedRow in backend/src/services/stats.service.ts. Shared by both
// bid-performance dashboards, which is why it lives here rather than in either
// one's own types file.
export interface AppliedRow {
  id: number;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  site: string | null;
  location: string | null;
  appliedAt: string;
  byUserId: number;
  byEmail: string;
  profileId: number;
  profileName: string;
}
