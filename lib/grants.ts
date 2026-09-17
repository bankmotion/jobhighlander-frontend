/**
 * Per-profile permissions a super admin grants.
 *
 * Deny by default: no grant means no permission. The feature list comes from the
 * server's registry rather than being duplicated here, so a feature added there
 * appears on the approvals screen with no frontend change at all.
 */
export interface FeatureDef {
  key: string;
  label: string;
  description: string;
  /** Present when the feature gates a job source. */
  site?: string;
}

export interface Grant {
  feature: string;
  grantedBy: string;
  createdAt: string;
}

export interface GrantProfile {
  id: number;
  name: string;
  email: string | null;
  owner: string;
  granted: Grant[];
}

export interface GrantsData {
  features: FeatureDef[];
  profiles: GrantProfile[];
}
