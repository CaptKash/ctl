import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { formatDate } from "@/lib/dateUtils";
import { StatCard } from "@/components/ui/StatCard";
import { RecordCard } from "@/components/ui/RecordCard";
import { apiGet } from "@/hooks/useApi";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { useCurrency } from "@/context/CurrencyContext";

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
  totalLicenseCost?: number;
  totalFuelCost: number;
  totalCost: number;
  maintenanceCount: number;
  partsCount: number;
  fuelCount: number;
  licenseRenewalCount?: number;
  insuranceRenewalCount?: number;
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
  license: { icon: "credit-card", color: "#0D9488", bg: "#CCFBF1" },
};

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { unit } = useDistanceUnit();
  const { currency } = useCurrency();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const rtlText = isRTL ? { textAlign: "right" as const, writingDirection: "rtl" as const } : null;

  const fmt = (n: number, digits = 0) =>
    `${currency.symbol}${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

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
  const licenseCost = report.totalLicenseCost ?? 0;
  const renewalsCount = (report.licenseRenewalCount ?? 0) + (report.insuranceRenewalCount ?? 0);

  const renewalDescription = (item: { type: string; description: string }) => {
    if (item.type === "license") return t("report.renewal.license");
    if (item.type === "insurance" && /renewal/i.test(item.description)) return t("report.renewal.insurance");
    return item.description;
  };

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: C.tint },
          isRTL && { flexDirection: "row-reverse" },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, rtlText]} numberOfLines={1}>
            {car.year} {car.make} {car.model}
          </Text>
          <Text style={[styles.headerSub, rtlText]}>{t("report.fullReport")}</Text>
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
          <Text style={styles.bannerLabel}>{t("report.totalLifetimeCost")}</Text>
          <Text style={styles.bannerValue}>{fmt(report.totalCost, 2)}</Text>
          <View style={[styles.bannerRow, isRTL && { flexDirection: "row-reverse" }]}>
            {car.mileage != null && (
              <Text style={styles.bannerMeta}>{car.mileage.toLocaleString()} {unit}</Text>
            )}
            {report.lastMaintenance && (
              <Text style={styles.bannerMeta}>
                {t("report.lastService", { date: formatDate(report.lastMaintenance) })}
              </Text>
            )}
          </View>
        </View>

        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }, rtlText]}>
            {t("report.costBreakdown")}
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="tool"
              iconColor={C.warning}
              iconBg={C.warningLight}
              label={t("report.categories.maintenance")}
              value={fmt(report.totalMaintenanceCost)}
            />
            <StatCard
              icon="box"
              iconColor={C.success}
              iconBg={C.successLight}
              label={t("report.categories.parts")}
              value={fmt(report.totalPartsCost)}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatCard
              icon="droplet"
              iconColor="#EF4444"
              iconBg="#FEE2E2"
              label={t("report.categories.fuel")}
              value={fmt(report.totalFuelCost)}
            />
            <StatCard
              icon="shield"
              iconColor={C.info}
              iconBg={C.infoLight}
              label={t("report.categories.insurance")}
              value={fmt(report.totalInsuranceCost)}
            />
          </View>
          {licenseCost > 0 && (
            <View style={styles.statsGrid}>
              <StatCard
                icon="credit-card"
                iconColor="#0D9488"
                iconBg="#CCFBF1"
                label={t("report.categories.license")}
                value={fmt(licenseCost)}
              />
              <View style={{ flex: 1 }} />
            </View>
          )}
        </View>

        {/* Activity Counts */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }, rtlText]}>
            {t("report.logbookSummary")}
          </Text>
          <View style={[styles.countsRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.countCard, { backgroundColor: C.card }]}>
              <Text style={[styles.countValue, { color: C.text }]}>{report.maintenanceCount}</Text>
              <Text style={[styles.countLabel, { color: C.textSecondary }]}>
                {t("report.counts.services")}
              </Text>
            </View>
            <View style={[styles.countCard, { backgroundColor: C.card }]}>
              <Text style={[styles.countValue, { color: C.text }]}>{report.partsCount}</Text>
              <Text style={[styles.countLabel, { color: C.textSecondary }]}>
                {t("report.counts.parts")}
              </Text>
            </View>
            <View style={[styles.countCard, { backgroundColor: C.card }]}>
              <Text style={[styles.countValue, { color: C.text }]}>{report.fuelCount}</Text>
              <Text style={[styles.countLabel, { color: C.textSecondary }]}>
                {t("report.counts.fillUps")}
              </Text>
            </View>
            {renewalsCount > 0 && (
              <View style={[styles.countCard, { backgroundColor: C.card }]}>
                <Text style={[styles.countValue, { color: C.text }]}>{renewalsCount}</Text>
                <Text style={[styles.countLabel, { color: C.textSecondary }]}>
                  {t("report.counts.renewals")}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Upcoming Due */}
        {report.upcomingMaintenanceDue.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }, rtlText]}>
              {t("report.upcomingServices")}
            </Text>
            <View
              style={[
                styles.alertBox,
                { backgroundColor: C.warningLight },
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <Feather name="alert-circle" size={16} color={C.warning} />
              <Text style={[styles.alertText, { color: "#92400E" }, rtlText]}>
                {t("report.upcomingDue", { count: report.upcomingMaintenanceDue.length })}
              </Text>
            </View>
            {report.upcomingMaintenanceDue.map((item) => (
              <RecordCard
                key={item.id}
                icon="clock"
                iconColor={C.warning}
                iconBg={C.warningLight}
                title={item.description}
                subtitle={
                  item.nextDueDate
                    ? t("report.dueLabel", { date: formatDate(item.nextDueDate) })
                    : t("report.dueSoon")
                }
                rightText={
                  item.nextDueMileage != null
                    ? `${item.nextDueMileage.toLocaleString()} ${unit}`
                    : undefined
                }
              />
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {report.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }, rtlText]}>
              {t("report.recentActivity")}
            </Text>
            {report.recentActivity.map((item, idx) => {
              const cfg = ACTIVITY_ICON[item.type] ?? ACTIVITY_ICON.maintenance;
              return (
                <RecordCard
                  key={idx}
                  icon={cfg.icon}
                  iconColor={cfg.color}
                  iconBg={cfg.bg}
                  title={renewalDescription(item)}
                  subtitle={formatDate(item.date)}
                  rightText={item.cost != null ? fmt(item.cost, 2) : undefined}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
      <BottomNav />
    </SwipeBackView>
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
    flexWrap: "wrap",
  },
  countCard: {
    flex: 1,
    minWidth: 80,
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
