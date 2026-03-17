import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiGet } from "@/hooks/useApi";

export type BottomNavTab = "dashboard" | "faults" | "history" | "settings";

const TABS: {
  id: BottomNavTab;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  route: string;
  activeColor?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid",           route: "/home" },
  { id: "faults",    label: "Fault Log", icon: "alert-triangle", route: "/faults", activeColor: "#DC2626" },
  { id: "history",   label: "History",   icon: "clock",          route: "/history" },
  { id: "settings",  label: "Settings",  icon: "settings",       route: "/settings" },
];

type Props = { active?: BottomNavTab };

export default function BottomNav({ active }: Props) {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
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
        const showDot = tab.id === "faults" && hasActiveFaults;
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
            <View style={[styles.iconWrap, isActive && { backgroundColor: (tab.activeColor ?? C.tint) + "15" }]}>
              <Feather
                name={tab.icon}
                size={18}
                color={isActive ? (tab.activeColor ?? C.tint) : C.textTertiary}
              />
              {showDot && <View style={styles.dot} />}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? (tab.activeColor ?? C.tint) : C.textTertiary },
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
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    fontFamily: "Inter_600SemiBold",
  },
});
