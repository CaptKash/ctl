import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
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
  { id: "tools",     label: "Tools",        icon: "tool",            route: "/tools" },
  { id: "settings",  label: "Settings",     icon: "settings",        route: "/settings" },
];

const ARCH_H = 26;
const FLAT_H = 24;

function buildFillPath(w: number, archH: number, totalH: number): string {
  const tw = w / 5;
  const cp = tw * 0.32;
  let d = `M 0 ${archH}`;
  for (let i = 0; i < 5; i++) {
    const cx = (i + 0.5) * tw;
    const right = (i + 1) * tw;
    d += ` C ${cx - cp} 1 ${cx + cp} 1 ${right} ${archH}`;
  }
  d += ` L ${w} ${totalH} L 0 ${totalH} Z`;
  return d;
}

function buildStrokePath(w: number, archH: number): string {
  const tw = w / 5;
  const cp = tw * 0.32;
  let d = `M 0 ${archH}`;
  for (let i = 0; i < 5; i++) {
    const cx = (i + 0.5) * tw;
    const right = (i + 1) * tw;
    d += ` C ${cx - cp} 1 ${cx + cp} 1 ${right} ${archH}`;
  }
  return d;
}

type Props = { active?: BottomNavTab };

export default function BottomNav({ active }: Props) {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { width } = Dimensions.get("window");
  const bottomPad = Platform.OS === "web" ? 8 : insets.bottom > 0 ? insets.bottom : 8;
  const totalH = ARCH_H + FLAT_H + bottomPad;

  const { data: faults } = useQuery<{ id: number; completed: boolean }[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<{ id: number; completed: boolean }[]>("/malfunctions"),
    staleTime: 30_000,
  });
  const hasActiveFaults = (faults ?? []).some((f) => !f.completed);

  const fillPath = buildFillPath(width, ARCH_H, totalH);
  const strokePath = buildStrokePath(width, ARCH_H);

  return (
    <View
      style={[
        { width, height: totalH },
        Platform.select({
          ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 },
          android: { elevation: 12 },
        }),
      ]}
    >
      {/* Arched SVG background */}
      <Svg width={width} height={totalH} style={StyleSheet.absoluteFillObject}>
        <Path d={fillPath} fill={C.card} />
        <Path d={strokePath} fill="none" stroke={C.border} strokeWidth={0.8} />
      </Svg>

      {/* Tab row — icons sit inside the arch bumps */}
      <View style={[styles.tabs, { paddingBottom: bottomPad }]}>
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
              <View style={[styles.iconWrap, isActive && { backgroundColor: iconColor + "18" }]}>
                <Feather name={tab.icon} size={22} color={iconColor} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    paddingTop: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 10,
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
