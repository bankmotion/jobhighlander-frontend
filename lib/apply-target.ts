/**
 * Where does "Apply" actually send you — and does the button say so?
 *
 * Two very different journeys hide behind one label. Either you land on the
 * posting on the source site, where you are already signed in and can apply in
 * a couple of clicks, or you are handed to the employer's own applicant
 * tracking system — Greenhouse, Workday, Lever, Ashby — and a long form.
 * Knowing which before you click is worth a word on the button.
 *
 * Decided by comparing the apply link's host against the JOB PAGE's host rather
 * than against a table of "linkedin means linkedin.com". Every source's job_url
 * is on its own domain, so the job URL already carries that fact, and a derived
 * answer keeps working when a new scraper is added — which has happened twice
 * while this was being written.
 *
 * With one named exception: a link to LinkedIn or Indeed is Easy Apply from
 * any source. A Jobright posting that sends you to LinkedIn is applied to on
 * LinkedIn, the same as one scraped from LinkedIn itself.
 *
 * The database computes the same answer (`easyApply`, a generated column on
 * jobs), and that is what the list filters on. When a job carries it, the label
 * uses it, so the button and the filter can never disagree about a posting. The
 * rule below is the fallback for a job object that does not carry it, and has
 * to stay the same as the SQL in migration 20260930190000_jobs_easy_apply.
 */

export type ApplyMode = 'onsite' | 'board' | 'external' | 'unknown';

/** Where the filter narrows the list to. Not per profile: a fact about the posting. */
export type ApplyFilter = 'all' | 'easy' | 'now';

export const isApplyFilter = (v: string): v is ApplyFilter =>
  v === 'all' || v === 'easy' || v === 'now';

/** Job boards that count as Easy Apply wherever the posting was found. */
const EASY_APPLY_BOARDS = new Set(['linkedin.com', 'indeed.com']);

const hostOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    // Sub-domains count as the same destination: `smartapply.indeed.com` is
    // still Indeed, and treating it as external would be a distinction without
    // a difference to whoever is applying.
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    // Manually added jobs may have no URL at all, and a scraper can store
    // something unparseable. Neither is worth throwing over.
    return null;
  }
};

const registrable = (h: string) => h.split('.').slice(-2).join('.');

/** Do two hosts belong to the same site, allowing for sub-domains? */
function sameSite(a: string, b: string): boolean {
  return a === b || registrable(a) === registrable(b);
}

export interface ApplyTarget {
  href: string;
  mode: ApplyMode;
  /** "Easy Apply" rather than "Apply Now". */
  easy: boolean;
  label: string;
  /** The tooltip — says where the link goes, which the label cannot. */
  hint: string;
}

export function applyTarget(job: {
  jobUrl: string;
  applyUrl: string | null;
  site: string;
  /** The database's answer. Absent on job objects from endpoints that omit it. */
  easyApply?: boolean | null;
}): ApplyTarget {
  const href = job.applyUrl || job.jobUrl;
  const applyHost = hostOf(href);
  const jobHost = hostOf(job.jobUrl);

  const onsite = Boolean(applyHost && jobHost && sameSite(applyHost, jobHost));
  const board = Boolean(applyHost && EASY_APPLY_BOARDS.has(registrable(applyHost)));
  const easy = typeof job.easyApply === 'boolean' ? job.easyApply : onsite || board;

  if (easy) {
    return {
      href,
      mode: onsite ? 'onsite' : 'board',
      easy: true,
      // Named for what it is from here: the application happens on a job
      // board, where you are likely already signed in, rather than in an
      // employer's own form.
      label: 'Easy Apply',
      hint: onsite
        ? `Apply on ${jobHost} — the posting's own site`
        : `Apply on ${applyHost ?? 'the job board'}`,
    };
  }

  if (!applyHost || !jobHost) {
    // No usable link to reason about — a manually added job with no URL, most
    // often. Say the plain thing rather than guessing.
    return {
      href,
      mode: 'unknown',
      easy: false,
      label: 'Apply Now',
      hint: href ? `Opens ${href}` : 'No link was given for this job',
    };
  }

  return {
    href,
    mode: 'external',
    easy: false,
    label: 'Apply Now',
    hint: `Opens ${applyHost} — the employer's own application site`,
  };
}
