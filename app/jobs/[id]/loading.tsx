import { LoadingView } from '@/app/components/loading-view';

/** A job posting is mostly prose — a description of a few hundred words. */
export default function Loading() {
  return <LoadingView variant="article" rows={7} />;
}
