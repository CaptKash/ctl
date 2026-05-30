import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { useQueries, useQuery } from "@tanstack/react-query";
import { useColors } from "@/context/ThemeContext";
import { useCurrency } from "@/context/CurrencyContext";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import BottomNav from "@/components/ui/BottomNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null; isElectric?: boolean | null };

type ReportData = {
  totalMaintenanceCost: number;
  totalPartsCost: number;
  totalInsuranceCost: number;
  totalLicenseCost: number;
  totalFuelCost: number;
  totalCost: number;
  maintenanceCount: number;
  partsCount: number;
  fuelCount: number;
  licenseRenewalCount: number;
  insuranceRenewalCount: number;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
    cost: number | null;
  }>;
};

function carLabel(car: Car) {
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  maintenance: { label: "Maintenance", icon: "tool",        color: "#2563EB", bg: "#DBEAFE" },
  parts:       { label: "Parts",        icon: "package",    color: "#7C3AED", bg: "#EDE9FE" },
  dealership:  { label: "Dealership",   icon: "map-pin",    color: "#D97706", bg: "#FEF3C7" },
  insurance:   { label: "Insurance",    icon: "shield",     color: "#059669", bg: "#D1FAE5" },
  license:     { label: "License",      icon: "credit-card", color: "#0D9488", bg: "#CCFBF1" },
};

export default function ServiceCostsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { currency } = useCurrency();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [filterCarId, setFilterCarId] = useState<number | null>(null);

  const carsQuery = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });
  const cars = carsQuery.data ?? [];

  const reportQueries = useQueries({
    queries: cars.map((car) => ({
      queryKey: ["report", car.id],
      queryFn: () => apiGet<ReportData>(`/cars/${car.id}/report`),
      enabled: cars.length > 0,
    })),
  });

  const isLoading = carsQuery.isLoading || reportQueries.some((q) => q.isLoading);

  const fmt = (n: number) => `${currency.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const aggregated = useMemo(() => {
    const carReports = reportQueries
      .map((q, i) => ({ car: cars[i], data: q.data }))
      .filter((x) => x.car && x.data) as { car: Car; data: ReportData }[];

    const filtered = filterCarId === null
      ? carReports
      : carReports.filter((x) => x.car.id === filterCarId);

    const maintenance = filtered.reduce((s, x) => s + x.data.totalMaintenanceCost, 0);
    const parts       = filtered.reduce((s, x) => s + x.data.totalPartsCost, 0);
    const insurance   = filtered.reduce((s, x) => s + x.data.totalInsuranceCost, 0);
    const license     = filtered.reduce((s, x) => s + (x.data.totalLicenseCost ?? 0), 0);
    const maintenanceCount = filtered.reduce((s, x) => s + x.data.maintenanceCount, 0);
    const partsCount  = filtered.reduce((s, x) => s + x.data.partsCount, 0);
    const insuranceCount = filtered.reduce(
      (s, x) => s + (x.data.insuranceRenewalCount ?? (x.data.totalInsuranceCost > 0 ? 1 : 0)),
      0,
    );
    const licenseCount = filtered.reduce((s, x) => s + (x.data.licenseRenewalCount ?? 0), 0);
    const total       = maintenance + parts + insurance + license;

    const allActivity = filtered.flatMap((x) =>
      x.data.recentActivity
        .filter((a) => a.type !== "fuel" && (a.cost ?? 0) > 0)
        .map((a) => ({ ...a, carLabel: carLabel(x.car) }))
    ).sort((a, b) => b.date.localeCompare(a.date));

    const categories = [
      { key: "maintenance", cost: maintenance, count: maintenanceCount },
      { key: "parts",       cost: parts,       count: partsCount },
      { key: "insurance",   cost: insurance,   count: insuranceCount },
      { key: "license",     cost: license,     count: licenseCount },
    ].filter((c) => c.cost > 0);

    const topCategory = [...categories].sort((a, b) => b.cost - a.cost)[0] ?? null;

    return { maintenance, parts, insurance, license, total, categories, allActivity, topCategory };
  }, [reportQueries, cars, filterCarId, currency]);

  const hasData = aggregated.total > 0 || aggregated.allActivity.length > 0;

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="dollar-sign" color="#7C3AED" bg="#F3E8FF" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Cost Tracker</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {filterCarId === null
                ? "All vehicles"
                : carLabel(cars.find((c) => c.id === filterCarId) ?? cars[0])}
            </Text>
          </View>
        </View>
      </View>

      {cars.length > 1 && (
        <View style={[styles.pillsContainer, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            <Pressable
              onPress={() => setFilterCarId(null)}
              style={[styles.pill, filterCarId === null && { backgroundColor: C.tint }]}
            >
              <Text style={[styles.pillText, { color: filterCarId === null ? "#fff" : C.textSecondary }]}>All</Text>
            </Pressable>
            {cars.map((car) => {
              const active = filterCarId === car.id;
              return (
                <Pressable
                  key={car.id}
                  onPress={() => setFilterCarId(car.id)}
                  style={[styles.pill, active && { backgroundColor: C.tint }]}
                >
                  <Text style={[styles.pillText, { color: active ? "#fff" : C.textSecondary }]}>
                    {carLabel(car)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 40 }} />
        ) : !hasData ? (
          <EmptyState
            icon="dollar-sign"
            title="No costs yet"
            description="Costs will appear here once you log maintenance, parts, renewals, or other records with a cost."
          />
        ) : (
          <>
            {/* Summary stat cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: C.card }]}>
                <Feather name="dollar-sign" size={15} color="#7C3AED" style={{ marginBottom: 4 }} />
                <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>{fmt(aggregated.total)}</Text>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total Spent</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: C.card }]}>
                <Feather name="tool" size={15} color="#2563EB" style={{ marginBottom: 4 }} />
                <Text style={[styles.statValue, { color: C.text }]}>
                  {aggregated.categories.reduce((s, c) => s + c.count, 0)}
                </Text>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>Service Records</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: C.card }]}>
                <Feather name="trending-up" size={15} color={C.warning} style={{ marginBottom: 4 }} />
                <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>
                  {aggregated.topCategory
                    ? CATEGORY_META[aggregated.topCategory.key]?.label ?? "—"
                    : "—"}
                </Text>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>Top Category</Text>
              </View>
            </View>

            {/* Category breakdown */}
            {aggregated.categories.length > 0 && (
              <View style={[styles.section, { backgroundColor: C.card }]}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>Breakdown</Text>
                {aggregated.categories.map((cat, idx) => {
                  const meta = CATEGORY_META[cat.key] ?? { label: cat.key, icon: "circle", color: "#6B7280", bg: "#F3F4F6" };
                  const pct = aggregated.total > 0 ? cat.cost / aggregated.total : 0;
                  return (
                    <View key={cat.key}>
                      {idx > 0 && <View style={[styles.divider, { backgroundColor: C.borderLight }]} />}
                      <View style={styles.categoryRow}>
                        <MetalIcon icon={meta.icon as any} color={meta.color} bg={meta.bg} size={16} style={styles.catIconBox} />
                        <View style={styles.catBody}>
                          <View style={styles.catLabelRow}>
                            <Text style={[styles.catLabel, { color: C.text }]}>{meta.label}</Text>
                            <Text style={[styles.catAmount, { color: C.text }]}>{fmt(cat.cost)}</Text>
                          </View>
                          <View style={[styles.barTrack, { backgroundColor: C.border }]}>
                            <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: meta.color }]} />
                          </View>
                          <Text style={[styles.catCount, { color: C.textSecondary }]}>
                            {cat.count} record{cat.count !== 1 ? "s" : ""} · {Math.round(pct * 100)}% of total
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recent entries */}
            {aggregated.allActivity.length > 0 && (
              <>
                <Text style={[styles.listHeading, { color: C.textSecondary }]}>Recent Entries</Text>
                <View style={[styles.section, { backgroundColor: C.card, gap: 0 }]}>
                  {aggregated.allActivity.map((item, idx) => {
                    const meta = CATEGORY_META[item.type] ?? { label: item.type, icon: "circle", color: "#6B7280", bg: "#F3F4F6" };
                    return (
                      <View key={idx}>
                        {idx > 0 && <View style={[styles.divider, { backgroundColor: C.borderLight }]} />}
                        <View style={styles.entryRow}>
                          <MetalIcon icon={meta.icon as any} color={meta.color} bg={meta.bg} size={15} style={styles.entryIconBox} />
                          <View style={styles.entryBody}>
                            <Text style={[styles.entryTitle, { color: C.text }]} numberOfLines={1}>
                              {item.description}
                            </Text>
                            <Text style={[styles.entrySub, { color: C.textSecondary }]}>
                              {filterCarId === null ? `${(item as any).carLabel} · ` : ""}{formatDate(item.date)} · {meta.label}
                            </Text>
                          </View>
                          {item.cost != null && (
                            <Text style={[styles.entryAmount, { color: C.text }]}>
                              {fmt(item.cost)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <BottomNav active="tools" />
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  pillsContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  pillsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  pillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { padding: 16, gap: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: "center",
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "rgba(0,0,0,0.05)",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  categoryRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  catIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  catBody: { flex: 1, gap: 6 },
  catLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  catAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  catCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  listHeading: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  entryIconBox: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  entryBody: { flex: 1, gap: 2 },
  entryTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  entrySub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  entryAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
