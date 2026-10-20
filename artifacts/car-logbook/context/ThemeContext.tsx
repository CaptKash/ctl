import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Colors, { ColorScheme } from "@/constants/colors";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "ctl_theme_preference";

type ThemeContextType = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (pref: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  preference: "system",
  resolvedTheme: "light",
  setPreference: async () => {},
});

async function loadPreference(): Promise<ThemePreference> {
  try {
    const val = Platform.OS === "web"
      ? localStorage.getItem(THEME_KEY)
      : await SecureStore.getItemAsync(THEME_KEY);
    if (val === "light" || val === "dark" || val === "system") return val;
  } catch {}
  return "system";
}

async function savePreference(pref: ThemePreference): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(THEME_KEY, pref);
    } else {
      await SecureStore.setItemAsync(THEME_KEY, pref);
    }
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    loadPreference().then(setPreferenceState);
  }, []);

  const resolvedTheme: "light" | "dark" =
    preference === "system"
      ? (systemScheme === "dark" ? "dark" : "light")
      : preference;

  const setPreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await savePreference(pref);
  };

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors(): ColorScheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? Colors.dark : Colors.light;
}
