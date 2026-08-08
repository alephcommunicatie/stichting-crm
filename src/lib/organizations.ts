export const ACTIVE_ORG_COOKIE = "active_org_id";

// Sentinel activeOrgId value for the developer "alle organisaties" mode.
// Only selectable by profiles with is_developer = true.
export const ALL_ORGS_ID = "all";

export type Membership = {
  organization_id: string;
  role: "owner" | "member";
  organizations: { id: string; name: string } | null;
};
