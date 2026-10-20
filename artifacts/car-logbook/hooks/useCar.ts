import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./useApi";
import type { CarRecord } from "./useCars";

// 30s stale time: individual car data changes only after an explicit edit,
// which invalidates this key via the mutation's onSuccess handler.
export function useCar<T = CarRecord>(carId: number | null) {
  return useQuery<T>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<T>(`/cars/${carId}`),
    enabled: carId !== null && carId > 0,
    staleTime: 30_000,
  });
}
