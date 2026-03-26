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
  { id: "dashboard", label: "Dashboard",    icon: "grid",            route: "/home" },
  { id: "faults",    label: "Active Faults", icon: "alert-triangle", route: "/faults", activeColor: "#DC2626" },
  { id: "history",   label: "History",      icon: "clock",           route: "/history" },
  { id: "tools",     label: "Tools",        icon: "sliders",         route: "/tools" },
  { id: "settings",  label: "Settings",     icon: "settings",        route: "/settings" },
];

type Props = { active?: BottomNavTab };

export default function BottomNav({ active }: Props) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const bottomPad = Platform.OS === "web" ? 8 : insets.bottom > 0 ? insets.bottom : 8;

  const { data: faults } = useQuery<{ id: number; completed: boolean }[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<{ id: number; completed: boolean }[]>("/malfunctions"),
    staleTime: 30_000,
  });
  const hasActiveFaults = (faults ?? []).some((f) => !f.completed);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: C.card,
          borderTopColor: C.border,
          paddingBottom: bottomPad,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const isFaultAlert = tab.id === "faults" && hasActiveFaults;
        const iconColor = isFaultAlert
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
            <View style={[styles.iconWrap, isActive && { backgroundColor: iconColor + "15" }]}>
              <Feather
                name={tab.icon}
                size={24}
                color={iconColor}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: iconColor },
                isActive && styles.labelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 -2px 10px rgba(0,0,0,0.08)" } as any,
    }),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 1,
    paddingHorizontal: 0,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    fontFamily: "Inter_600SemiBold",
  },
});
