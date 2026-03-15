import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
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
import { useAuth } from "@/context/AuthContext";

type Car = { id: number };
type UpcomingItem = { id: number };

export default function MenuDashboardScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace("/(tabs)/");
  };

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

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: C.textSecondary }]}>{today}</Text>
          <Text style={[styles.headerTitle, { color: C.text }]}>
            {isAuthenticated && user ? `Hi, ${user.name.split(" ")[0]}` : "CTL"}
          </Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>Car Technical Log</Text>
        </View>
        <Pressable
          onPress={handleLogout}
          hitSlop={10}
          style={[styles.logoutBtn, { backgroundColor: C.backgroundTertiary }]}
        >
          <Feather name="log-out" size={18} color={C.textSecondary} />
        </Pressable>
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

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/event/add");
          }}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="plus-circle" size={24} color={C.tint} />
          </View>
          <View style={styles.tileBody}>
            <Text style={[styles.tileTitle, { color: C.text }]}>Add Event</Text>
            <Text style={[styles.tileSub, { color: C.textSecondary }]}>
              Log a malfunction, maintenance, or registration
            </Text>
          </View>
          <View style={styles.tileArrow}>
            <Feather name="chevron-right" size={18} color={C.textTertiary} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/fleet");
          }}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#EDE9FE" }]}>
            <Feather name="truck" size={24} color="#7C3AED" />
          </View>
          <View style={styles.tileBody}>
            <Text style={[styles.tileTitle, { color: C.text }]}>My Fleet</Text>
            <Text style={[styles.tileSub, { color: C.textSecondary }]}>
              {fleetCount === 0
                ? "No vehicles registered yet"
                : `${fleetCount} vehicle${fleetCount === 1 ? "" : "s"} registered`}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/car/add");
            }}
            hitSlop={6}
            style={[styles.addCarChip, { backgroundColor: C.tint }]}
          >
            <Feather name="plus" size={13} color="#fff" />
            <Text style={styles.addCarChipText}>Add Car</Text>
          </Pressable>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/maintenance/upcoming");
          }}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="calendar" size={24} color="#DC2626" />
          </View>
          <View style={styles.tileBody}>
            <Text style={[styles.tileTitle, { color: C.text }]}>Upcoming Events</Text>
            <Text style={[styles.tileSub, { color: C.textSecondary }]}>
              {upcomingCount === 0
                ? "No upcoming events"
                : `${upcomingCount} event${upcomingCount === 1 ? "" : "s"} coming up`}
            </Text>
          </View>
          <View style={styles.tileArrow}>
            <Feather name="chevron-right" size={18} color={C.textTertiary} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
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
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
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

  tile: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
    minHeight: 80,
  },
  tileIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileBody: {
    flex: 1,
    gap: 3,
  },
  tileTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tileSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  tileArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  addCarChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addCarChipText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
