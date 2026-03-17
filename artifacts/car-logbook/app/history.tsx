import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";
import { DashboardIcon, DASHBOARD_LIGHTS } from "@/components/ui/DashboardLightIcons";

type CarStub = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type FaultRecord = {
  id: number;
  carId: number;
  description: string;
  date: string;
  phase: string;
  completed: boolean;
  dashboardMessage?: string | null;
  car: CarStub | null;
};

type MaintenanceRecord = {
  id: number;
  carId: number;
  description: string;
  date: string;
  type: string;
  shop?: string | null;
  cost?: number | null;
  car: CarStub | null;
};

type HistoryItem = {
  key: string;
  carId: number;
  type: "malfunction" | "maintenance";
  date: string;
  title: string;
  subtitle: string;
  carName: string;
  completed: boolean;
  dashboardMessage?: string | null;
};

const EVENT_META = {
  malfunction: { label: "Fault",  icon: "alert-triangle" as const, bg: "#FEE2E2", color: "#DC2626" },
  maintenance: { label: "Repair", icon: "tool"           as const, bg: "#FEF3C7", color: "#D97706" },
};

function carLabel(car: CarStub | null): string {
  if (!car) return "Unknown car";
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  const faultsQuery = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const repairsQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance-all"],
    queryFn: () => apiGet<MaintenanceRecord[]>("/maintenance"),
  });

  const isLoading = faultsQuery.isLoading || repairsQuery.isLoading;

  const allItems: HistoryItem[] = React.useMemo(() => {
    const faults = (faultsQuery.data ?? []).map((r): HistoryItem => ({
      key: `malfunction-${r.id}`,
      carId: r.carId,
      type: "malfunction",
      date: r.date,
      title: r.description,
      subtitle: (r.phase ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      carName: carLabel(r.car),
      completed: r.completed,
      dashboardMessage: r.dashboardMessage,
    }));

    const repairs = (repairsQuery.data ?? []).map((r): HistoryItem => ({
      key: `maintenance-${r.id}`,
      carId: r.carId,
      type: "maintenance",
      date: r.date,
      title: r.description,
      subtitle: [r.type, r.shop].filter(Boolean).join(" · "),
      carName: carLabel(r.car),
      completed: false,
    }));

    return [...faults, ...repairs].sort((a, b) => b.date.localeCompare(a.date));
  }, [faultsQuery.data, repairsQuery.data]);

  // Unique cars that have records
  const cars: CarStub[] = React.useMemo(() => {
    const map = new Map<number, CarStub>();
    [...(faultsQuery.data ?? []), ...(repairsQuery.data ?? [])].forEach((r) => {
      if (r.car && !map.has(r.carId)) map.set(r.carId, r.car);
    });
    return Array.from(map.values());
  }, [faultsQuery.data, repairsQuery.data]);

  const items = selectedCarId == null
    ? allItems
    : allItems.filter((ev) => ev.carId === selectedCarId);

  const headerSub = isLoading
    ? "Loading…"
    : selectedCarId == null
      ? `${allItems.length} record${allItems.length !== 1 ? "s" : ""}${cars.length > 1 ? ` · ${cars.length} cars` : ""}`
      : carLabel(cars.find((c) => c.id === selectedCarId) ?? null);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="clock" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>History</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>{headerSub}</Text>
          </View>
          {!isLoading && allItems.length > 0 && (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/report"); }}
              style={({ pressed }) => [styles.reportBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="file-text" size={14} color="#059669" />
              <Text style={styles.reportBtnText}>Generate Report</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Car selector chips */}
      {!isLoading && cars.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsBar}
          contentContainerStyle={styles.chips}
        >
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelectedCarId(null); }}
            style={[
              styles.chip,
              { backgroundColor: selectedCarId == null ? C.tint : C.card, borderColor: selectedCarId == null ? C.tint : C.border },
            ]}
          >
            <Text style={[styles.chipText, { color: selectedCarId == null ? "#fff" : C.text }]}>All</Text>
          </Pressable>
          {cars.map((car) => {
            const active = car.id === selectedCarId;
            return (
              <Pressable
                key={car.id}
                onPress={() => { Haptics.selectionAsync(); setSelectedCarId(car.id); }}
                style={[
                  styles.chip,
                  { backgroundColor: active ? C.tint : C.card, borderColor: active ? C.tint : C.border },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? "#fff" : C.text }]} numberOfLines={1}>
                  {carLabel(car)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="clock" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No History Yet</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            Logged faults and repairs will appear here automatically.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.map((ev) => {
            const meta = EVENT_META[ev.type];
            return (
              <View key={ev.key} style={[styles.card, { backgroundColor: C.card, borderColor: meta.color }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeGroup}>
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                      <Feather name={meta.icon} size={11} color={meta.color} />
                      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {ev.completed && (
                      <View style={styles.resolvedStamp}>
                        <Text style={styles.resolvedStampText}>RESOLVED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dateText, { color: C.textTertiary }]}>{formatDate(ev.date)}</Text>
                </View>

                <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>{ev.title}</Text>

                {ev.type === "malfunction" && !!ev.dashboardMessage && (() => {
                  const ids = ev.dashboardMessage.split(",").map((s) => s.trim()).filter(Boolean);
                  const lights = DASHBOARD_LIGHTS.filter((l) => ids.includes(l.id));
                  if (!lights.length) return null;
                  return (
                    <View style={styles.iconsRowBg}>
                      {lights.map((l) => (
                        <DashboardIcon key={l.id} id={l.id} size={20} />
                      ))}
                    </View>
                  );
                })()}

                {ev.subtitle ? (
                  <View style={styles.cardMeta}>
                    <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>{ev.subtitle}</Text>
                  </View>
                ) : null}

                <View style={styles.cardMeta}>
                  <Text style={[styles.metaText, { color: C.textTertiary }]} numberOfLines={1}>{ev.carName}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <BottomNav active="history" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipsBar: { flexShrink: 0, flexGrow: 0, height: 54 },
  listScroll: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#059669" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

  chips: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  resolvedStamp: {
    borderWidth: 2,
    borderColor: "#059669",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    opacity: 0.85,
  },
  resolvedStampText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#059669",
    letterSpacing: 1.5,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#CBD5E1" },
  iconsRowBg: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", backgroundColor: "#4B5563", borderRadius: 10, padding: 10 },
});
