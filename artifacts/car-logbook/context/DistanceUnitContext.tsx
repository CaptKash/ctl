import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type DistanceUnit = "km" | "mi";

const UNIT_KEY = "ctl_distance_unit";

type DistanceUnitContextType = {
  unit: DistanceUnit;
  setUnit: (u: DistanceUnit) => Promise<void>;
};

const DistanceUnitContext = createContext<DistanceUnitContextType>({
  unit: "km",
  setUnit: async () => {},
});

async function loadUnit(): Promise<DistanceUnit> {
  try {
    const val = Platform.OS === "web"
      ? localStorage.getItem(UNIT_KEY)
      : await SecureStore.getItemAsync(UNIT_KEY);
    if (val === "km" || val === "mi") return val;
  } catch {}
  return "km";
}

async function saveUnit(u: DistanceUnit): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(UNIT_KEY, u);
    } else {
      await SecureStore.setItemAsync(UNIT_KEY, u);
    }
  } catch {}
}

export function DistanceUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<DistanceUnit>("km");

  useEffect(() => {
    loadUnit().then(setUnitState);
  }, []);

  const setUnit = async (u: DistanceUnit) => {
    setUnitState(u);
    await saveUnit(u);
  };

  return (
    <DistanceUnitContext.Provider value={{ unit, setUnit }}>
      {children}
    </DistanceUnitContext.Provider>
  );
}

export function useDistanceUnit() {
  return useContext(DistanceUnitContext);
}
