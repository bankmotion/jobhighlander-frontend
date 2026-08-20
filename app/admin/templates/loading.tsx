import { LoadingView } from '@/app/components/loading-view';

/** The template gallery is a grid of preview tiles. */
export default function Loading() {
  return <LoadingView variant="grid" rows={6} />;
}
