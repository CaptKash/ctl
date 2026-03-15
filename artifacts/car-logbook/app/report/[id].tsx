import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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
import { StatCard } from "@/components/ui/StatCard";
import { RecordCard } from "@/components/ui/RecordCard";
import { apiGet } from "@/hooks/useApi";

type CarReport = {
  car: {
    id: number;
    make: string;
    model: string;
    year: number;
    mileage?: number | null;
    licensePlate?: string | null;
  };
  totalMaintenanceCost: number;
  totalPartsCost: number;
  totalInsuranceCost: number;
  totalFuelCost: number;
  totalCost: number;
  maintenanceCount: number;
  partsCount: number;
  fuelCount: number;
  lastMaintenance?: string | null;
  upcomingMaintenanceDue: Array<{
    id: number;
    description: string;
    nextDueDate?: string | null;
    nextDueMileage?: number | null;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    date: string;
    cost?: number | null;
  }>;
};

const ACTIVITY_ICON: Record<string, { icon: keyof typeof Feather.glyphMap; color: string; bg: string }> = {
  maintenance: { icon: "tool", color: "#F59E0B", bg: "#FEF3C7" },
  parts: { icon: "box", color: "#10B981", bg: "#D1FAE5" },
  fuel: { icon: "droplet", color: "#EF4444", bg: "#FEE2E2" },
  dealership: { icon: "map-pin", color: "#8B5CF6", bg: "#EDE9FE" },
  insurance: { icon: "shield", color: "#3B82F6", bg: "#DBEAFE" },
};

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;

  const { data: report, isLoading } = useQuery<CarReport>({
    queryKey: ["report", carId],
    queryFn: () => apiGet<CarReport>(`/cars/${carId}/report`),
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  if (!report) return null;

  const { car } = report;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: C.tint }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {car.year} {car.make} {car.model}
          </Text>
          <Text style={styles.headerSub}>Full Report</Text>
        </View>
        <Feather name="file-text" size={20} color="rgba(255,255,255,0.7)" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Banner */}
        <View style={[styles.banner, { backgroundColor: C.tint }]}>
          <Text style={styles.bannerLabel}>Total Lifetime Cost</Text>
          <Text style={styles.bannerValue}>${report.totalCost.toFixed(2)}</Text>
          <View style={styles.bannerRow}>
            {car.mileage != null && (
              <Text style={styles.bannerMeta}>{car.mileage.toLocaleString()} km</Text>
            )}
            {report.lastMaintenance && (
              <Text style={styles.bannerMeta}>Last service: {report.lastMaintenance}</Text>
            )}
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Cost Breakdown</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="tool"
              iconColor={C.warning}
              iconBg={C.warningLight}
              label="Maintenance"
              value={`$${report.totalMaintenanceCost.toFixed(0)}`}
            />
            <StatCard
              icon="box"
              iconColor={C.success}
              iconBg={C.successLight}
              label="Parts"
              value={`$${report.totalPartsCost.toFixed(0)}`}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon="droplet"
              iconColor="#EF4444"
              iconBg="#FEE2E2"
              label="Fuel"
              value={`$${report.totalFuelCost.toFixed(0)}`}
            />
            <StatCard
              icon="shield"
              iconColor={C.info}
              iconBg={C.infoLight}
              label="Insurance"
              value={`$${report.totalInsuranceCost.toFixed(0)}`}
            />
          </View>
        </View>

        {/* Activity Counts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Logbook Summary</Text>
          <View style={styles.countsRow}>
            <View style={[styles.countCard, { backgroundColor: C.card }]}>
              <Text style={[styles.countValue, { color: C.text }]}>{report.maintenanceCount}</Text>
              <Text style={[styles.countLabel, { color: C.textSecondary }]}>Services</Text>
            </View>
            <View style={[styles.countCard, { backgroundColor: C.card }]}>
              <Text style={[styles.countValue, { color: C.text }]}>{report.partsCount}</Text>
              <Text style={[styles.countLabel, { color: C.textSecondary }]}>Parts</Text>
            </View>
            <View style={[styles.countCard, { backgroundColor: C.card }]}>
              <Text style={[styles.countValue, { color: C.text }]}>{report.fuelCount}</Text>
              <Text style={[styles.countLabel, { color: C.textSecondary }]}>Fill-ups</Text>
            </View>
          </View>
        </View>

        {/* Upcoming Due */}
        {report.upcomingMaintenanceDue.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Upcoming Services</Text>
            <View style={[styles.alertBox, { backgroundColor: C.warningLight }]}>
              <Feather name="alert-circle" size={16} color={C.warning} />
              <Text style={[styles.alertText, { color: "#92400E" }]}>
                {report.upcomingMaintenanceDue.length} service(s) due soon
              </Text>
            </View>
            {report.upcomingMaintenanceDue.map((item) => (
              <RecordCard
                key={item.id}
                icon="clock"
                iconColor={C.warning}
                iconBg={C.warningLight}
                title={item.description}
                subtitle={item.nextDueDate ? `Due: ${formatDate(item.nextDueDate)}` : "Due soon"}
                rightText={item.nextDueMileage != null ? `${item.nextDueMileage.toLocaleString()} km` : undefined}
              />
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {report.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Activity</Text>
            {report.recentActivity.map((item, idx) => {
              const cfg = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.maintenance;
              return (
                <RecordCard
                  key={idx}
                  icon={cfg.icon}
                  iconColor={cfg.color}
                  iconBg={cfg.bg}
                  title={item.description}
                  subtitle={formatDate(item.date)}
                  rightText={item.cost != null ? `$${item.cost.toFixed(2)}` : undefined}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 8 },
  banner: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 4,
    alignItems: "center",
    gap: 4,
  },
  bannerLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bannerValue: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  bannerRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  bannerMeta: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  alertText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  countsRow: {
    flexDirection: "row",
    gap: 10,
  },
  countCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "rgba(0,0,0,0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  countValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  countLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
