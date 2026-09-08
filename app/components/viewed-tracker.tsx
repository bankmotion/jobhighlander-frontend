'use client';

import { useEffect } from 'react';
import { claimViewed, markViewed } from '@/lib/viewed-jobs';

/**
 * Ties the stored marks to the signed-in account.
 *
 * Mounted once per page rather than per card. localStorage survives a sign-out,
 * so without this the next person on the same browser inherits the previous
 * one's history — and a posting wrongly shown as already-seen is one they will
 * skip without ever having read it.
 */
export function ViewedOwner({ email }: { email: string | null }) {
  useEffect(() => {
    // Empty string for a signed-out reader: still an owner value, so signing in
    // afterwards is recognised as a change and starts clean.
    claimViewed(email ?? '');
  }, [email]);
  return null;
}

/**
 * Marks a posting viewed because its own page was opened.
 *
 * The list panel marks on the open call itself; a full page load has no such
 * call, so arriving here is the equivalent signal. In an effect because the
 * server cannot touch localStorage.
 */
export function MarkViewedOnMount({ jobId }: { jobId: number }) {
  useEffect(() => {
    markViewed(jobId);
  }, [jobId]);
  return null;
}
