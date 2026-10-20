import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type MCIName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type VehicleType =
  | "car"
  | "van"
  | "pickup_truck"
  | "suv"
  | "truck"
  | "bus"
  | "motorcycle"
  | "ambulance"
  | "tractor"
  | "digger"
  | "forklift"
  | "tow_truck"
  | "other";

export type UsageUnitKind = "distance" | "hours";

export const VEHICLE_TYPES: VehicleType[] = [
  "car",
  "van",
  "pickup_truck",
  "suv",
  "truck",
  "bus",
  "motorcycle",
  "ambulance",
  "tractor",
  "digger",
  "forklift",
  "tow_truck",
  "other",
];

const HOUR_BASED_TYPES: VehicleType[] = ["tractor", "digger", "forklift"];

const VEHICLE_TYPE_ICONS: Record<VehicleType, MCIName> = {
  car: "car",
  van: "van-utility",
  pickup_truck: "truck-flatbed",
  suv: "car-side",
  truck: "truck",
  bus: "bus",
  motorcycle: "motorbike",
  ambulance: "ambulance",
  tractor: "tractor",
  digger: "excavator",
  forklift: "forklift",
  tow_truck: "tow-truck",
  other: "car-wrench",
};

export function normalizeVehicleType(type?: string | null): VehicleType {
  if (type && (VEHICLE_TYPES as string[]).includes(type)) {
    return type as VehicleType;
  }
  return "car";
}

export function usageUnitForType(type?: string | null): UsageUnitKind {
  return HOUR_BASED_TYPES.includes(normalizeVehicleType(type)) ? "hours" : "distance";
}

export function isHourBased(usageUnit?: string | null): boolean {
  return usageUnit === "hours";
}

export function vehicleTypeIcon(type?: string | null): MCIName {
  return VEHICLE_TYPE_ICONS[normalizeVehicleType(type)];
}

export function vehicleTypeLabelKey(type?: string | null): string {
  return `vehicleTypes.${normalizeVehicleType(type)}`;
}

export function usageUnitLabel(
  usageUnit: string | null | undefined,
  globalUnit: string,
  hoursLabel: string
): string {
  return isHourBased(usageUnit) ? hoursLabel : globalUnit;
}
