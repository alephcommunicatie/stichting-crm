export const ACTIVE_ORG_COOKIE = "active_org_id";

export type Membership = {
  organization_id: string;
  role: "owner" | "member";
  organizations: { id: string; name: string } | null;
};
