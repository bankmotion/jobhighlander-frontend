import { LoadingView } from '@/app/components/loading-view';

/** One tall card per owned profile, each listing who it is shared with. */
export default function Loading() {
  return <LoadingView rows={3} />;
}
