/**
 * Ask-AI types and labels.
 *
 * DELIBERATELY FREE OF SERVER IMPORTS — the panel is a client component and
 * imports the labels below as values. Same rule as `interviews.ts`; the fetcher
 * lives in `job-queries.server.ts`.
 */

/** Which context documents existed when the question was answered. */
export interface QueryContext {
  profile: boolean;
  resume: boolean;
  coverLetter: boolean;
}

export interface JobQuery {
  id: number;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  question: string;
  answer: string;
  model: string;
  context: QueryContext;
  askedBy: string;
  createdAt: string;
}

/** Matches the backend cap; the textarea hard-stops at the same number. */
export const QUESTION_MAX_CHARS = 4_000;

/**
 * Starter questions.
 *
 * An empty textarea beside a "Generate" button is a blank page problem: the
 * feature can answer almost anything, which is exactly why it is hard to think
 * of the first thing to ask.
 *
 * Deliberately MIXED, because the prompt has two modes and the first one is not
 * obvious. The first two are application-form questions and come back as a
 * pasteable first-person answer; the last two ask for advice and come back
 * addressed to you. Showing only one kind would hide half the feature.
 */
export const SUGGESTED_QUESTIONS: string[] = [
  'Why are you interested in this role?',
  'What relevant experience do you have for this position?',
  'What are my biggest gaps for this role?',
  'What should I ask the interviewer?',
];
