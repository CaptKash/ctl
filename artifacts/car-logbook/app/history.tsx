import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Platform,
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
  type: "malfunction" | "maintenance";
  date: string;
  title: string;
  subtitle: string;
  carName: string;
  completed: boolean;
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

  const faultsQuery = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const repairsQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance-all"],
    queryFn: () => apiGet<MaintenanceRecord[]>("/maintenance"),
  });

  const isLoading = faultsQuery.isLoading || repairsQuery.isLoading;

  const items: HistoryItem[] = React.useMemo(() => {
    const faults = (faultsQuery.data ?? []).map((r): HistoryItem => ({
      key: `malfunction-${r.id}`,
      type: "malfunction",
      date: r.date,
      title: r.description,
      subtitle: (r.phase ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      carName: carLabel(r.car),
      completed: r.completed,
    }));

    const repairs = (repairsQuery.data ?? []).map((r): HistoryItem => ({
      key: `maintenance-${r.id}`,
      type: "maintenance",
      date: r.date,
      title: r.description,
      subtitle: [r.type, r.shop].filter(Boolean).join(" · "),
      carName: carLabel(r.car),
      completed: false,
    }));

    return [...faults, ...repairs].sort((a, b) => b.date.localeCompare(a.date));
  }, [faultsQuery.data, repairsQuery.data]);

  const totalCars = React.useMemo(() => {
    const ids = new Set([
      ...(faultsQuery.data ?? []).map((r) => r.carId),
      ...(repairsQuery.data ?? []).map((r) => r.carId),
    ]);
    return ids.size;
  }, [faultsQuery.data, repairsQuery.data]);

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
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {isLoading ? "Loading…" : `${items.length} record${items.length !== 1 ? "s" : ""}${totalCars > 1 ? ` · ${totalCars} cars` : ""}`}
            </Text>
          </View>
        </View>
      </View>

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
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.map((ev) => {
            const meta = EVENT_META[ev.type];
            return (
              <View key={ev.key} style={[styles.card, { backgroundColor: C.card, borderColor: meta.color }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Feather name={meta.icon} size={11} color={meta.color} />
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[styles.dateText, { color: C.textTertiary }]}>{formatDate(ev.date)}</Text>
                </View>

                <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>{ev.title}</Text>

                {ev.subtitle ? (
                  <View style={styles.cardMeta}>
                    <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>{ev.subtitle}</Text>
                  </View>
                ) : null}

                <View style={styles.cardMeta}>
                  <Feather name="car" size={12} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textTertiary }]} numberOfLines={1}>{ev.carName}</Text>
                  {ev.completed && (
                    <>
                      <View style={styles.metaDot} />
                      <Feather name="check-circle" size={12} color="#059669" />
                      <Text style={[styles.metaText, { color: "#059669" }]}>Resolved</Text>
                    </>
                  )}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
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
});
