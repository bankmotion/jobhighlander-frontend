// Mirrors AdminProfileRow in backend/src/services/profile.service.ts.
export interface AdminProfileRow {
  id: number;
  name: string;
  email: string | null;
  location: string | null;
  owner: { id: number; email: string; role: string };
  memberCount: number;
  applications: number;
  resumes: number;
  createdAt: string;
  updatedAt: string;
}
