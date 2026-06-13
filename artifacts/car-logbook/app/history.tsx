import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useTranslation } from "react-i18next";
import { useColors, useTheme } from "@/context/ThemeContext";
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
  warningMessage?: string | null;
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
  warningMessage?: string | null;
};

const EVENT_META = {
  malfunction: { icon: "alert-triangle" as const, bg: "#FEE2E2", color: "#DC2626" },
  maintenance: { icon: "tool"           as const, bg: "#FEF3C7", color: "#D97706" },
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const carLabel = (car: CarStub | null): string => {
    if (!car) return t("history.unknownCar");
    return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
  };

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
      subtitle: r.phase
        ? (i18n.exists(`faults.phases.${r.phase}`)
            ? t(`faults.phases.${r.phase}`)
            : r.phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        : "",
      carName: carLabel(r.car),
      completed: r.completed,
      dashboardMessage: r.dashboardMessage,
      warningMessage: r.warningMessage,
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
  }, [faultsQuery.data, repairsQuery.data, i18n.language]);

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
    ? t("history.loading")
    : selectedCarId == null
      ? `${t("history.records", { count: allItems.length })}${cars.length > 1 ? t("history.carsSuffix", { count: cars.length }) : ""}`
      : carLabel(cars.find((c) => c.id === selectedCarId) ?? null);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <LinearGradient
            colors={["#DBEAFE", "#93C5FD", "#2563EB"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#1E40AF" }]}
          >
            <Feather name="clock" size={22} color="#1E3A8A" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("history.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{headerSub}</Text>
          </View>
          {!isLoading && allItems.length > 0 && (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push("/report"); }}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <LinearGradient
                colors={["#D1FAE5", "#A7F3D0", "#6EE7B7"]}
                locations={[0, 0.55, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[styles.reportBtn, isRTL && { flexDirection: "row-reverse" }]}
              >
                <Feather name="file-text" size={14} color="#065F46" />
                <Text style={styles.reportBtnText}>{t("history.generateReport")}</Text>
              </LinearGradient>
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
          contentContainerStyle={[styles.chips, isRTL && { flexDirection: "row-reverse" }]}
        >
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelectedCarId(null); }}
            style={[
              styles.chip,
              { backgroundColor: selectedCarId == null ? C.tint : C.card, borderColor: selectedCarId == null ? C.tint : C.border },
            ]}
          >
            <Text style={[styles.chipText, { color: selectedCarId == null ? "#fff" : C.text }]}>{t("history.all")}</Text>
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
          <Text style={[styles.emptyTitle, { color: C.text }]}>{t("history.emptyTitle")}</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            {t("history.emptyDesc")}
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
              <LinearGradient
                key={ev.key}
                colors={isDark ? ["#283449", "#1E293B", "#16202F"] : ["#FFFFFF", "#F4F5F7", "#E6E8EB"]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: meta.color }, isRTL && { borderLeftWidth: 1, borderRightWidth: 4 }]}
              >
                <View style={[styles.cardHeader, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.badgeGroup, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.badge, { backgroundColor: meta.bg }, isRTL && { flexDirection: "row-reverse" }]}>
                      <Feather name={meta.icon} size={11} color={meta.color} />
                      <Text style={[styles.badgeText, { color: meta.color }]}>{t(`history.badge.${ev.type}`)}</Text>
                    </View>
                    {ev.type === "malfunction" && (
                      ev.completed ? (
                        <View style={[styles.resolvedStamp, isRTL && { flexDirection: "row-reverse" }]}>
                          <Feather name="check" size={11} color="#fff" />
                          <Text style={styles.resolvedStampText}>{t("history.resolved")}</Text>
                        </View>
                      ) : (
                        <View style={[styles.activeStamp, isRTL && { flexDirection: "row-reverse" }]}>
                          <Feather name="alert-circle" size={11} color="#fff" />
                          <Text style={styles.activeStampText}>{t("history.active")}</Text>
                        </View>
                      )
                    )}
                  </View>
                  <Text style={[styles.carNameHeader, { color: C.textSecondary, textAlign: isRTL ? "left" : "right" }]} numberOfLines={1}>{ev.carName}</Text>
                </View>

                <Text style={[styles.cardTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{ev.title}</Text>

                {ev.type === "malfunction" && !!ev.warningMessage && (
                  <Text style={[styles.warningMsgText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                    <Text style={styles.warningMsgLabel}>{t("history.dashboardMessageLabel")}</Text>
                    {ev.warningMessage}
                  </Text>
                )}

                {ev.type === "malfunction" && !!ev.dashboardMessage && (() => {
                  const ids = ev.dashboardMessage.split(",").map((s) => s.trim()).filter(Boolean);
                  const lights = DASHBOARD_LIGHTS.filter((l) => ids.includes(l.id));
                  if (!lights.length) return null;
                  return (
                    <View style={[styles.iconsRowBg, isRTL && { alignSelf: "flex-end" }]}>
                      {lights.map((l) => (
                        <DashboardIcon key={l.id} id={l.id} color={l.warningColor} size={20} />
                      ))}
                    </View>
                  );
                })()}

                {ev.subtitle ? (
                  <View style={styles.cardMeta}>
                    <Text style={[styles.metaText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>{ev.subtitle}</Text>
                  </View>
                ) : null}

                <View style={[styles.dateRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="calendar" size={13} color={C.textSecondary} />
                  <Text style={[styles.dateText, { color: C.textSecondary }]}>{formatDate(ev.date)}</Text>
                </View>
              </LinearGradient>
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#047857",
  },
  reportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#065F46" },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#059669",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resolvedStampText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  activeStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DC2626",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeStampText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
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
  dateText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  carNameHeader: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#CBD5E1" },
  warningMsgText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  warningMsgLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  iconsRowBg: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", alignSelf: "flex-start", backgroundColor: "#4B5563", borderRadius: 10, padding: 10 },
});
