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

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type Event = {
  id: number;
  type: "maintenance" | "malfunction";
  date: string;
  title: string;
  subtitle: string;
  completed?: boolean;
};

const EVENT_META: Record<Event["type"], { label: string; icon: React.ComponentProps<typeof Feather>["name"]; bg: string; color: string }> = {
  malfunction: { label: "Fault",   icon: "alert-triangle", bg: "#FEE2E2", color: "#DC2626" },
  maintenance: { label: "Repair",  icon: "tool",           bg: "#FEF3C7", color: "#D97706" },
};

function carLabel(car: Car) {
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  const carsQuery = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
    onSuccess: (data) => {
      if (data.length > 0 && selectedCarId === null) {
        setSelectedCarId(data[0].id);
      }
    },
  } as any);

  const cars = carsQuery.data ?? [];
  const activeCar = cars.find((c) => c.id === selectedCarId) ?? cars[0] ?? null;

  React.useEffect(() => {
    if (cars.length > 0 && selectedCarId === null) {
      setSelectedCarId(cars[0].id);
    }
  }, [cars]);

  const eventsQuery = useQuery<Event[]>({
    queryKey: ["history-events", activeCar?.id],
    queryFn: async () => {
      const all = await apiGet<Event[]>(`/cars/${activeCar!.id}/events?includeCompleted=true`);
      return all.filter((e) => e.type === "malfunction" || e.type === "maintenance");
    },
    enabled: !!activeCar,
  });

  const events = eventsQuery.data ?? [];

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
              {activeCar ? carLabel(activeCar) : "Select a car"}
            </Text>
          </View>
          {activeCar && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/report/[id]", params: { id: String(activeCar.id) } });
              }}
              style={[styles.reportBtn, { backgroundColor: "#D1FAE5" }]}
            >
              <Feather name="file-text" size={15} color="#059669" />
              <Text style={[styles.reportBtnText, { color: "#059669" }]}>Report</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Car selector */}
      {cars.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carChips}
        >
          {cars.map((car) => {
            const selected = car.id === activeCar?.id;
            return (
              <Pressable
                key={car.id}
                onPress={() => { Haptics.selectionAsync(); setSelectedCarId(car.id); }}
                style={[
                  styles.carChip,
                  { backgroundColor: selected ? C.tint : C.card, borderColor: selected ? C.tint : C.border },
                ]}
              >
                <Text style={[styles.carChipText, { color: selected ? "#fff" : C.text }]} numberOfLines={1}>
                  {carLabel(car)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Events list */}
      {carsQuery.isLoading || eventsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : cars.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="car" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No Cars Added</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>Add a car from the dashboard to see its history.</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="clock" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No Events Yet</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>Logged faults and repairs will appear here.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {events.map((ev) => {
            const meta = EVENT_META[ev.type];
            return (
              <View key={`${ev.type}-${ev.id}`} style={[styles.card, { backgroundColor: C.card, borderColor: meta.color }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                      <Feather name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {ev.completed && (
                      <View style={[styles.badge, { backgroundColor: "#D1FAE5" }]}>
                        <Feather name="check-circle" size={11} color="#059669" />
                        <Text style={[styles.badgeText, { color: "#059669" }]}>Resolved</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dateText, { color: C.textTertiary }]}>{formatDate(ev.date)}</Text>
                </View>
                <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>{ev.title}</Text>
                {ev.subtitle ? (
                  <Text style={[styles.cardSub, { color: C.textSecondary }]} numberOfLines={1}>{ev.subtitle}</Text>
                ) : null}
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
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  carChips: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
  },
  carChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  carChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

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
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
