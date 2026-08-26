import { LoadingView } from '@/app/components/loading-view';

/** The calendar is a six-row grid; a table skeleton is the closest shape. */
export default function Loading() {
  return <LoadingView variant="table" rows={6} />;
}
