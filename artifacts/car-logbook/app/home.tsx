import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiGet } from "@/hooks/useApi";

type Car = { id: number };
type UpcomingItem = { id: number };

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  wide?: boolean;
  onPress: () => void;
};

export default function MenuDashboardScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: cars } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const { data: upcoming } = useQuery<UpcomingItem[]>({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => apiGet<UpcomingItem[]>("/maintenance/upcoming"),
  });

  const fleetCount = cars?.length ?? 0;
  const upcomingCount = upcoming?.length ?? 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const menuItems: MenuItem[] = [
    {
      id: "add-car",
      title: "Add Car",
      subtitle: "Register a new vehicle",
      icon: "plus-circle",
      iconBg: "#DBEAFE",
      iconColor: C.tint,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/car/add");
      },
    },
    {
      id: "fleet",
      title: "My Fleet",
      subtitle:
        fleetCount === 0
          ? "No vehicles registered yet"
          : `${fleetCount} vehicle${fleetCount === 1 ? "" : "s"} registered`,
      icon: "truck",
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
      wide: true,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/fleet");
      },
    },
    {
      id: "add-maintenance",
      title: "Add Maintenance",
      subtitle: "Log a service record",
      icon: "tool",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/maintenance/add");
      },
    },
    {
      id: "upcoming",
      title: "Upcoming Maintenance",
      subtitle:
        upcomingCount === 0
          ? "No upcoming services"
          : `${upcomingCount} item${upcomingCount === 1 ? "" : "s"} due`,
      icon: "calendar",
      iconBg: "#FEE2E2",
      iconColor: "#DC2626",
      wide: true,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/maintenance/upcoming");
      },
    },
  ];

  const narrow = menuItems.filter((i) => !i.wide);
  const wide = menuItems.filter((i) => i.wide);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: C.textSecondary }]}>{today}</Text>
          <Text style={[styles.headerTitle, { color: C.text }]}>CTL</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>Car Technical Log</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.logoBox, { backgroundColor: "#080F1E" }]}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={[styles.logoutBtn, { backgroundColor: C.backgroundTertiary }]}
          >
            <Feather name="log-out" size={15} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Quick Actions</Text>

        {/* First narrow row */}
        <View style={styles.row}>
          {narrow.map((item) => (
            <MenuTile key={item.id} item={item} flex />
          ))}
        </View>

        {/* Wide tiles */}
        {wide.map((item) => (
          <MenuTile key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

function MenuTile({ item, flex }: { item: MenuItem; flex?: boolean }) {
  const C = Colors.light;
  return (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
        flex && { flex: 1 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: item.iconBg }]}>
        <Feather name={item.icon} size={24} color={item.iconColor} />
      </View>
      <Text style={[styles.tileTitle, { color: C.text }]}>{item.title}</Text>
      <Text style={[styles.tileSub, { color: C.textSecondary }]} numberOfLines={2}>
        {item.subtitle}
      </Text>
      <View style={styles.tileArrow}>
        <Feather name="arrow-right" size={14} color={C.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  headerEyebrow: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerRight: { alignItems: "flex-end", gap: 8 },
  logoBox: {
    width: 54,
    height: 54,
    borderRadius: 13,
    overflow: "hidden",
  },
  logo: { width: 54, height: 54 },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 24 },

  grid: { padding: 20, gap: 14 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  row: { flexDirection: "row", gap: 14 },

  tile: {
    borderRadius: 18,
    padding: 18,
    paddingBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
    minHeight: 148,
  },
  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tileSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    flex: 1,
  },
  tileArrow: { alignItems: "flex-end" },
});
