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
  /** Why. Always present — the reason is the reason the record exists. */
  note: string;
  rejectedAt: string;
  rejectedBy: string;
}

export type RejectionStatusMap = Record<number, RejectionStatus>;
