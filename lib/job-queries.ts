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
 * of the first thing to ask. These are the questions worth asking of a posting
 * you are deciding about.
 */
export const SUGGESTED_QUESTIONS: string[] = [
  'What are the biggest gaps between my background and this posting, and how should I address them in a screening call?',
  'Draft three questions I should ask the interviewer about this role.',
  'What salary range is realistic for me here, and what does my record support?',
  'Which of my past projects should I lead with, and why?',
];
