import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export type BottomNavTab = "dashboard" | "faults" | "settings";

const TABS: {
  id: BottomNavTab;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  route: string;
  activeColor?: string;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid",           route: "/home" },
  { id: "faults",    label: "Fault Log", icon: "alert-triangle", route: "/faults", activeColor: "#DC2626" },
  { id: "settings",  label: "Settings",  icon: "settings",       route: "/settings" },
];

type Props = { active?: BottomNavTab };

export default function BottomNav({ active }: Props) {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const bottomPad = Platform.OS === "web" ? 8 : insets.bottom > 0 ? insets.bottom : 8;

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
                size={22}
                color={isActive ? (tab.activeColor ?? C.tint) : C.textTertiary}
              />
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
    gap: 4,
  },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    fontFamily: "Inter_600SemiBold",
  },
});
