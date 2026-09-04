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
 */

export type ApplyMode = 'onsite' | 'external' | 'unknown';

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

/** Do two hosts belong to the same site, allowing for sub-domains? */
function sameSite(a: string, b: string): boolean {
  if (a === b) return true;
  const registrable = (h: string) => h.split('.').slice(-2).join('.');
  return registrable(a) === registrable(b);
}

export interface ApplyTarget {
  href: string;
  mode: ApplyMode;
  label: string;
  /** The tooltip — says where the link goes, which the label cannot. */
  hint: string;
}

export function applyTarget(job: {
  jobUrl: string;
  applyUrl: string | null;
  site: string;
}): ApplyTarget {
  const href = job.applyUrl || job.jobUrl;
  const applyHost = hostOf(href);
  const jobHost = hostOf(job.jobUrl);

  if (!applyHost || !jobHost) {
    // No usable link to reason about — a manually added job with no URL, most
    // often. Say the plain thing rather than guessing.
    return {
      href,
      mode: 'unknown',
      label: 'Apply Now',
      hint: href ? `Opens ${href}` : 'No link was given for this job',
    };
  }

  if (sameSite(applyHost, jobHost)) {
    return {
      href,
      mode: 'onsite',
      // Named for what it is from here: the application happens on the site the
      // posting is on, where you are likely already signed in.
      label: 'Easy Apply',
      hint: `Apply on ${jobHost} — the posting's own site`,
    };
  }

  return {
    href,
    mode: 'external',
    label: 'Apply Now',
    hint: `Opens ${applyHost} — the employer's own application site`,
  };
}
