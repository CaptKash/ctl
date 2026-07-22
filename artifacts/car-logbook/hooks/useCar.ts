import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./useApi";
import type { CarRecord } from "./useCars";

export function useCar<T = CarRecord>(carId: number | null) {
  return useQuery<T>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<T>(`/cars/${carId}`),
    enabled: carId !== null && carId > 0,
  });
}
