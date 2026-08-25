import { fetchJobs, fetchFilters } from '@/lib/api';
import { fetchKeywords } from '@/lib/keywords';
import { fetchProfiles } from '@/lib/profiles';
import { fetchPresets } from '@/lib/templates';
import { fetchResumeStatus } from '@/lib/resumes';
import { fetchAppliedStatus, isAppliedFilter, type AppliedFilter } from '@/lib/applications';
import { fetchCoverLetterStatus } from '@/lib/cover-letters';
import { fetchDiscardStatus, isDiscardedFilter, type DiscardedFilter } from '@/lib/discards';
import { fetchInterviewStatus } from '@/lib/interviews.server';
import { FiltersBar } from '@/app/components/filters-bar';
import { JobCard } from '@/app/components/job-card';
import { Pagination } from '@/app/components/pagination';
import { AppliedProvider } from '@/app/components/applied-provider';
import { CoverLetterProvider } from '@/app/components/cover-letter-provider';
import { DiscardProvider } from '@/app/components/discard-provider';
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
  const appliedParam = str(sp.applied);
  const applied: AppliedFilter = isAppliedFilter(appliedParam) ? appliedParam : 'all';
  const discardedParam = str(sp.discarded);
  // Defaults to `all`, matching the applied filter: discarding greys a card out
  // rather than making it vanish, so nothing leaves the list without the reader
  // having asked for it.
  const discarded: DiscardedFilter = isDiscardedFilter(discardedParam) ? discardedParam : 'all';

  const [filters, profiles, presets, session, keywords] = await Promise.all([
    fetchFilters().catch(() => ({ sites: [], locations: [] })),
    fetchProfiles().catch(() => []),
    fetchPresets().catch(() => []),
    getSession(),
    // Same emphasis words the detail page marks up, so a description reads the
    // same whether it is scanned in the list or opened. Highlighting is a
    // nicety, so a failure here costs the marks, never the job list.
    fetchKeywords()
      .then((ks) => ks.map((k) => k.word))
      .catch(() => []),
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
    applied,
    discarded,
    ...(profiles.length > 1 && profileId ? { profile: profileId } : {}),
  };

  // Everyone can now reach /profiles, so the only thing the role decides is
  // whether the empty-state offers "create one" or "ask to be invited".
  const canManageProfiles = isAdminRole(session?.role);

  let data;
  let error: string | null = null;
  try {
    data = await fetchJobs({
      q: query.q,
      sites: query.sites,
      remote,
      // Applied is recorded per profile, so the filter travels with one. The
      // backend ignores it without a profile the caller may actually use.
      applied,
      discarded,
      profileId,
      page,
      pageSize: 20,
    });
  } catch {
    error = 'Could not reach the backend API. Is it running on http://localhost:4000 ?';
  }

  // Both resolved on the server: fetching either from the client would paint
  // every card as "no resume, not applied" first and then correct itself.
  const jobIds = (data?.items ?? []).map((j) => j.id);
  const [resumeStatus, appliedStatus, coverLetterStatus, discardStatus, interviewStatus] = profileId
    ? await Promise.all([
        fetchResumeStatus(profileId, jobIds),
        fetchAppliedStatus(profileId, jobIds),
        fetchCoverLetterStatus(profileId, jobIds),
        fetchDiscardStatus(profileId, jobIds),
        fetchInterviewStatus(profileId, jobIds),
      ])
    : [{}, {}, {}, {}, {}];

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

      <FiltersBar filters={filters} current={query} canFilterApplied={Boolean(profileId)} />

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : data && data.items.length > 0 ? (
        <AppliedProvider
          // Same reasoning as the resume provider: switching profile is a change
          // of subject, so the applied badges must not survive it.
          key={profileId ?? 'none'}
          profileId={profileId}
          initial={appliedStatus}
          viewerEmail={session?.email ?? null}
        >
          <ResumeListProvider
            // Switching profile is a change of subject, not of filter: remount so
            // an open resume modal, its rendered PDF and any confirm dialog go
            // with the profile they belonged to. The status map itself re-seeds
            // on every server snapshot, which covers filters and paging too.
            key={profileId ?? 'none'}
            profileId={profileId}
            initialStatus={resumeStatus}
            presets={presets}
          >
            <CoverLetterProvider
              // Inside ResumeListProvider on purpose: the control reads that
              // map to know whether the resume it is written from exists, which
              // is what lets the gate cost no extra request.
              key={profileId ?? 'none'}
              profileId={profileId}
              initial={coverLetterStatus}
            >
              <DiscardProvider
                // Remounts with the profile for the same reason the others do:
                // a discard belongs to the profile it was made for, so carrying
                // one profile's dismissals onto another is exactly wrong.
                key={profileId ?? 'none'}
                profileId={profileId}
                initial={discardStatus}
                viewerEmail={session?.email ?? null}
              >
                <ul className="grid gap-4">
                  {data.items.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      profileId={profileId}
                      keywords={keywords}
                      interview={interviewStatus[job.id] ?? null}
                    />
                  ))}
                </ul>
                <Pagination pagination={data.pagination} query={query} />
              </DiscardProvider>
            </CoverLetterProvider>
          </ResumeListProvider>
        </AppliedProvider>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]">
          {applied === 'applied' ? (
            <>No jobs marked as applied yet for this profile.</>
          ) : applied === 'unapplied' ? (
            <>Every job matching these filters is already marked as applied.</>
          ) : (
            <>
              No jobs yet. Run the Python scraper (<code>python main.py indeed</code>) to populate
              the database.
            </>
          )}
        </div>
      )}
    </div>
  );
}
