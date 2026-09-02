
import type { AiProvider } from './ai-providers';

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
  provider: AiProvider | null;
  providerLabel: string;
  context: QueryContext;
  askedBy: string;
  createdAt: string;
}

export const QUESTION_MAX_CHARS = 4_000;

export const SUGGESTED_QUESTIONS: string[] = [
  'Why are you interested in this role?',
  'What relevant experience do you have for this position?',
  'What are my biggest gaps for this role?',
  'What should I ask the interviewer?',
];
