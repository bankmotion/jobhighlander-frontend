/**
 * "The employer said no", per profile per posting.
 *
 * A sibling of `discards`, never a replacement: a discard is this profile
 * deciding a posting is not a fit, a rejection is the employer deciding the
 * candidate is not. Both can be true of one job, and reading a week's work back
 * they mean opposite things.
 */
export interface RejectionStatus {
  jobId: number;
  /** Why, when a reason was given. Null is a normal outcome, not a gap. */
  note: string | null;
  rejectedAt: string;
  rejectedBy: string;
}

export type RejectionStatusMap = Record<number, RejectionStatus>;
