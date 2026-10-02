
import type { AiProvider } from './ai-providers';

export interface QueryContext {
  profile: boolean;
  resume: boolean;
  coverLetter: boolean;
  /** Earlier questions on this posting replayed with this one. */
  earlier?: number;
}

/** A screenshot pasted into a question, fetched by id for the log. */
export interface QueryAttachment {
  id: number;
  mediaType: string;
}

export interface JobQuery {
  id: number;
  jobId: number | null;
  jobTitle: string;
  jobCompany: string | null;
  question: string;
  answer: string;
  model: string;
  provider: AiProvider | null;
  providerLabel: string;
  context: QueryContext;
  attachments?: QueryAttachment[];
  askedBy: string;
  createdAt: string;
}

export const QUESTION_MAX_CHARS = 4_000;

/** Screenshots per question. Matches MAX_IMAGES on the backend. */
export const MAX_SCREENSHOTS = 3;

/** Earlier questions the AI is shown with each new one. Matches HISTORY_TURNS. */
export const REMEMBERED_QUESTIONS = 5;

export const SUGGESTED_QUESTIONS: string[] = [
  'Why are you interested in this role?',
  'What relevant experience do you have for this position?',
  'What are my biggest gaps for this role?',
  'What should I ask the interviewer?',
];
