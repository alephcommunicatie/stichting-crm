"use client";

import { createContext, useContext } from "react";

export type OrgOption = { id: string; name: string; role: string };

type OrgContextValue = {
  activeOrgId: string;
  activeOrgName: string;
  memberships: OrgOption[];
};

const OrgContext = createContext<OrgContextValue | null>(null);

export default function OrgProvider({
  children,
  activeOrgId,
  activeOrgName,
  memberships,
}: {
  children: React.ReactNode;
  activeOrgId: string;
  activeOrgName: string;
  memberships: OrgOption[];
}) {
  return (
    <OrgContext.Provider value={{ activeOrgId, activeOrgName, memberships }}>
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
