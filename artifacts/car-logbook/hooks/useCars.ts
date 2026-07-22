import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./useApi";

export interface CarRecord {
  id: number;
  make: string;
  model: string;
  year: number;
  vehicleType?: string | null;
  usageUnit?: string | null;
  nickname?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  licenseValidUntil?: string | null;
  photos?: string | null;
  isElectric?: boolean | null;
  tankCapacity?: number | null;
  vin?: string | null;
  notes?: string | null;
  initialMileage?: number | null;
  insuredUntil?: string | null;
  insuredWith?: string | null;
}

// 30s stale time: the car list rarely changes mid-session; this avoids
// a full re-fetch on every tab navigation while keeping data fresh.
export function useCars<T = CarRecord>(options?: { staleTime?: number }) {
  return useQuery<T[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<T[]>("/cars"),
    staleTime: 30_000,
    ...options,
  });
}
