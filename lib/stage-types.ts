import type { StageBadge } from './interviews';

/**
 * Stage-type shapes.
 *
 * Types only, no server imports — same rule as `interviews.ts`. The badge
 * picker and the admin manager are both client components, so anything
 * reachable from here can end up in the browser bundle; the fetchers live in
 * `stage-types.server.ts`.
 */
export interface StageType extends StageBadge {
  sortOrder: number;
}

/** The admin listing adds how many steps wear each badge. */
export interface StageTypeWithUsage extends StageType {
  usage: number;
}
