import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/context/ThemeContext";
import { apiGet } from "@/hooks/useApi";

export type BottomNavTab = "dashboard" | "faults" | "history" | "tools" | "settings";

const TABS: {
  id: BottomNavTab;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  route: string;
  activeColor?: string;
}[] = [
  { id: "dashboard", label: "Home",    icon: "grid",            route: "/home" },
  { id: "faults",    label: "Faults",  icon: "alert-triangle",  route: "/faults", activeColor: "#DC2626" },
  { id: "history",   label: "History", icon: "clock",           route: "/history" },
  { id: "tools",     label: "Tools",   icon: "tool",            route: "/tools" },
  { id: "settings",  label: "Settings",icon: "settings",        route: "/settings" },
];

type Props = { active?: BottomNavTab };

export default function BottomNav({ active }: Props) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const bottomPad = Platform.OS === "web" ? 12 : insets.bottom > 0 ? insets.bottom + 4 : 12;

  const { data: faults } = useQuery<{ id: number; completed: boolean }[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<{ id: number; completed: boolean }[]>("/malfunctions"),
    staleTime: 30_000,
  });
  const hasActiveFaults = (faults ?? []).some((f) => !f.completed);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomPad }]}>
      <View style={[styles.container, { backgroundColor: C.card }]}>
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const isFaultAlert = tab.id === "faults" && hasActiveFaults;
          const accentColor = isFaultAlert
            ? "#DC2626"
            : isActive
            ? (tab.activeColor ?? C.tint)
            : C.textTertiary;

          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                if (isActive) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace(tab.route as any);
              }}
              style={styles.tab}
              hitSlop={4}
            >
              <View
                style={[
                  styles.iconWrap,
                  isActive && {
                    backgroundColor: accentColor,
                    transform: [{ translateY: -14 }],
                    shadowColor: accentColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.45,
                    shadowRadius: 8,
                    elevation: 8,
                  },
                ]}
              >
                <Feather
                  name={tab.icon}
                  size={isActive ? 22 : 22}
                  color={isActive ? "#fff" : accentColor}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: accentColor },
                  isActive && styles.labelActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  container: {
    flexDirection: "row",
    borderRadius: 28,
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.13)" } as any,
    }),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    fontFamily: "Inter_700Bold",
  },
});
