import { fetchJobs, fetchFilters } from '@/lib/api';
import { fetchProfiles } from '@/lib/profiles';
import { fetchPresets } from '@/lib/templates';
import { fetchResumeStatus } from '@/lib/resumes';
import { FiltersBar } from '@/app/components/filters-bar';
import { JobCard } from '@/app/components/job-card';
import { Pagination } from '@/app/components/pagination';
import { ResumeListProvider } from '@/app/components/resume-list-provider';
import { ResumeProfileNotice } from '@/app/components/resume-action';
import { ResumeProfilePicker } from '@/app/components/resume-profile-picker';
import { getSession } from '@/lib/auth';
import { isAdminRole } from '@/lib/session';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

function arr(v: string | string[] | undefined): string[] {
  const list = Array.isArray(v) ? v : v === undefined ? [] : [v];
  return list.map((s) => s.trim()).filter(Boolean);
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // Remote-only is the DEFAULT (checkbox checked); only `remote=0` shows all.
  const remote = str(sp.remote) !== '0';
  const page = Math.max(1, Number(str(sp.page)) || 1);

  const [filters, profiles, presets, session] = await Promise.all([
    fetchFilters().catch(() => ({ sites: [], locations: [] })),
    fetchProfiles().catch(() => []),
    fetchPresets().catch(() => []),
    getSession(),
  ]);

  // `?profile=` wins so the choice is shareable and the server render is already
  // correct; otherwise the first profile — which `fetchProfiles` orders owned-
  // first, so an admin never lands on someone else's shared profile by default.
  const wanted = Number(str(sp.profile));
  const profile = profiles.find((p) => p.id === wanted) ?? profiles[0];
  const profileId = profile?.id ?? null;

  // Carried by every filter and page link. Only pinned once the user has picked
  // one, so the common single-profile case keeps a clean URL.
  const query = {
    q: str(sp.q),
    sites: arr(sp.site),
    remote,
    ...(profiles.length > 1 && profileId ? { profile: profileId } : {}),
  };

  // Everyone can now reach /profiles, so the only thing the role decides is
  // whether the empty-state offers "create one" or "ask to be invited".
  const canManageProfiles = isAdminRole(session?.role);

  let data;
  let error: string | null = null;
  try {
    data = await fetchJobs({ q: query.q, sites: query.sites, remote, page, pageSize: 20 });
  } catch {
    error = 'Could not reach the backend API. Is it running on http://localhost:4000 ?';
  }

  // Resolved on the server: fetching this from the client would paint every card
  // as "no resume" first and then correct itself.
  const resumeStatus = profileId
    ? await fetchResumeStatus(
        profileId,
        (data?.items ?? []).map((j) => j.id),
      )
    : {};

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Jobs</h1>
          <p className="text-sm text-[var(--muted)]">
            Postings scraped from job sites into the local database.
          </p>
        </div>
        {/* Only worth the space when there is actually a choice to make. */}
        {profiles.length > 1 && profile && (
          <ResumeProfilePicker profiles={profiles} selectedId={profile.id} />
        )}
      </div>

      {!profileId && <ResumeProfileNotice canManage={canManageProfiles} />}

      <FiltersBar filters={filters} current={query} />

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : data && data.items.length > 0 ? (
        <ResumeListProvider
          profileId={profileId}
          initialStatus={resumeStatus}
          presets={presets}
        >
          <ul className="grid gap-4">
            {data.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </ul>
          <Pagination pagination={data.pagination} query={query} />
        </ResumeListProvider>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          No jobs yet. Run the Python scraper (<code>python main.py indeed</code>) to populate the
          database.
        </div>
      )}
    </div>
  );
}
