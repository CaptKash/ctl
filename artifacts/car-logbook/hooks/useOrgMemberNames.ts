import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/hooks/useApi";
import { useOrg } from "@/context/OrgContext";

type OrgMember = { userId: number | null; name: string | null; email: string };

export function useOrgMemberNames() {
  const { activeOrgId } = useOrg();
  const { data } = useQuery<OrgMember[]>({
    queryKey: ["orgs", activeOrgId, "members"],
    queryFn: () => apiGet<OrgMember[]>(`/orgs/${activeOrgId}/members`),
    enabled: activeOrgId != null,
  });
  return useCallback(
    (userId: number | null | undefined): string | null => {
      if (activeOrgId == null || userId == null) return null;
      const m = data?.find((x) => x.userId === userId);
      return m ? m.name ?? m.email ?? null : null;
    },
    [activeOrgId, data],
  );
}
