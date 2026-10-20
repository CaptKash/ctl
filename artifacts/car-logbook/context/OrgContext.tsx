import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/hooks/useApi";

export type OrgRole = "admin" | "staff" | "client";

export type OrgSummary = {
  id: number;
  name: string;
  organizationType: "fleet" | "repair_shop";
  seatLimit: number | null;
  ownerUserId: number;
  createdAt: string;
  role: OrgRole;
};

export type OrgInvite = {
  memberId: number;
  orgId: number;
  orgName: string;
  organizationType: "fleet" | "repair_shop";
  role: OrgRole;
  invitedAt: string;
};

type OrgContextValue = {
  orgs: OrgSummary[];
  invites: OrgInvite[];
  isLoading: boolean;
  activeOrgId: number | null;
  setActiveOrgId: (id: number | null) => void;
  activeOrg: OrgSummary | null;
  activeRole: OrgRole | null;
  isOrgContext: boolean;
  refetch: () => void;
};

const Context = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const enabled = !!user?.id;
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);

  const orgsQuery = useQuery<OrgSummary[]>({
    queryKey: ["orgs"],
    queryFn: () => apiGet<OrgSummary[]>("/orgs"),
    enabled,
  });

  const invitesQuery = useQuery<OrgInvite[]>({
    queryKey: ["orgs", "invites"],
    queryFn: () => apiGet<OrgInvite[]>("/orgs/invites"),
    enabled,
  });

  const orgs = orgsQuery.data ?? [];
  const invites = invitesQuery.data ?? [];

  // Reset the active context whenever the user signs out.
  useEffect(() => {
    if (!enabled) setActiveOrgId(null);
  }, [enabled]);

  // If the active org is no longer one the user belongs to (left/removed/
  // deleted), fall back to the personal context.
  useEffect(() => {
    if (activeOrgId != null && !orgs.some((o) => o.id === activeOrgId)) {
      setActiveOrgId(null);
    }
  }, [activeOrgId, orgs]);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? null;

  const value: OrgContextValue = {
    orgs,
    invites,
    isLoading: orgsQuery.isLoading || invitesQuery.isLoading,
    activeOrgId,
    setActiveOrgId,
    activeOrg,
    activeRole: activeOrg?.role ?? null,
    isOrgContext: activeOrg != null,
    refetch: () => {
      orgsQuery.refetch();
      invitesQuery.refetch();
    },
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOrg() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider");
  return ctx;
}
