export interface CarStub {
  nickname?: string | null;
  year: number;
  make: string;
  model: string;
}

export function carLabel(car: CarStub | null, fallback = ""): string {
  if (!car) return fallback;
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}
