import { LoadingView } from '@/app/components/loading-view';

/** Interviews renders an agenda grid above a list of process rows. */
export default function Loading() {
  return <LoadingView variant="list" rows={5} />;
}
