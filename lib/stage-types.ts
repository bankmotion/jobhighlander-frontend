import type { StageBadge } from './interviews';

export interface StageType extends StageBadge {
  sortOrder: number;
}

export interface StageTypeWithUsage extends StageType {
  usage: number;
}
