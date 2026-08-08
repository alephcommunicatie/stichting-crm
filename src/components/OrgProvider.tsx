"use client";

import { createContext, useContext } from "react";

export type OrgOption = { id: string; name: string; role: string };

type OrgContextValue = {
  activeOrgId: string;
  activeOrgName: string;
  memberships: OrgOption[];
  isDeveloper: boolean;
  isAllOrgsMode: boolean;
  // Safe organization_id to use when writing new records: the active org,
  // or the first real membership when browsing "alle organisaties".
  writeOrgId: string;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export default function OrgProvider({
  children,
  activeOrgId,
  activeOrgName,
  memberships,
  isDeveloper,
}: {
  children: React.ReactNode;
  activeOrgId: string;
  activeOrgName: string;
  memberships: OrgOption[];
  isDeveloper: boolean;
}) {
  const isAllOrgsMode = activeOrgId === "all";
  const writeOrgId = isAllOrgsMode ? memberships[0]?.id || activeOrgId : activeOrgId;

  return (
    <OrgContext.Provider
      value={{ activeOrgId, activeOrgName, memberships, isDeveloper, isAllOrgsMode, writeOrgId }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useActiveOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useActiveOrg must be used within an OrgProvider");
  }
  return ctx;
}
