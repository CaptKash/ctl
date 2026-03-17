import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
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

type MaintenanceLog = {
  id: number;
  carId: number;
  type: string;
  description: string;
  date: string;
  cost?: number | null;
  shop?: string | null;
  shopAddress?: string | null;
  warrantyPeriod?: string | null;
  car: Car | null;
};

export default function RepairHistoryScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: logs, isLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ["all-maintenance"],
    queryFn: () => apiGet<MaintenanceLog[]>("/maintenance"),
  });

  function carLabel(car: Car | null) {
    if (!car) return "Unknown Car";
    return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="tool" size={22} color="#D97706" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Repair History</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>All maintenance logs</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : !logs || logs.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="tool" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No Repair Logs Yet</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            Saved maintenance logs will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {logs.map((log) => (
            <View key={log.id} style={[styles.card, { backgroundColor: C.card, shadowColor: C.shadow }]}>
              <View style={[styles.cardAccent, { backgroundColor: "#D97706" }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: "#FEF3C7" }]}>
                    <Feather name="tool" size={12} color="#D97706" />
                    <Text style={[styles.typeBadgeText, { color: "#D97706" }]}>{log.type}</Text>
                  </View>
                  <Text style={[styles.carName, { color: C.textTertiary }]} numberOfLines={1}>
                    {carLabel(log.car)}
                  </Text>
                </View>

                <Text style={[styles.description, { color: C.text }]} numberOfLines={2}>
                  {log.description}
                </Text>

                <View style={styles.cardMeta}>
                  <Feather name="calendar" size={12} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{formatDate(log.date)}</Text>

                  {log.shop ? (
                    <>
                      <View style={styles.metaDot} />
                      <Feather name="map-pin" size={12} color={C.textTertiary} />
                      <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>
                        {log.shop}
                      </Text>
                    </>
                  ) : null}
                </View>

                {(log.cost != null || log.warrantyPeriod) ? (
                  <View style={styles.cardFooter}>
                    {log.cost != null && (
                      <View style={[styles.costChip, { backgroundColor: "#D1FAE5" }]}>
                        <Text style={[styles.costChipText, { color: "#065F46" }]}>
                          ${log.cost.toFixed(2)}
                        </Text>
                      </View>
                    )}
                    {log.warrantyPeriod ? (
                      <View style={[styles.warrantyChip, { backgroundColor: "#EDE9FE" }]}>
                        <Feather name="shield" size={11} color="#7C3AED" />
                        <Text style={[styles.warrantyChipText, { color: "#7C3AED" }]}>
                          {log.warrantyPeriod}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <BottomNav active="dashboard" />
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
  backBtn: {},
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    flexDirection: "row",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 8 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  carName: { fontSize: 11, fontFamily: "Inter_500Medium", flexShrink: 1 },
  description: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1", marginHorizontal: 2 },
  cardFooter: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  costChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  costChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  warrantyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  warrantyChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
