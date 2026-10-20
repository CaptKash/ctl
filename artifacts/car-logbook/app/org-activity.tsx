import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { useOrg } from "@/context/OrgContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dateUtils";
import { vehicleTypeIcon } from "@/lib/vehicleTypes";
import { apiGet } from "@/hooks/useApi";

type ActivityKind =
  | "maintenance"
  | "fault"
  | "inspection"
  | "fuel"
  | "part"
  | "insurance"
  | "dealership"
  | "renewal";

type ActivityCar = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname: string | null;
  vehicleType: string;
};

type ActivityItem = {
  id: number;
  kind: ActivityKind;
  carId: number;
  car: ActivityCar | null;
  byUserId: number | null;
  byName: string | null;
  byEmail: string | null;
  date: string | null;
  createdAt: string;
  title: string | null;
};

const KIND_META: Record<ActivityKind, { icon: React.ComponentProps<typeof Feather>["name"]; bg: string; color: string }> = {
  maintenance: { icon: "tool", bg: "#FEF3C7", color: "#D97706" },
  fault: { icon: "alert-triangle", bg: "#FEE2E2", color: "#DC2626" },
  inspection: { icon: "check-square", bg: "#DBEAFE", color: "#2563EB" },
  fuel: { icon: "droplet", bg: "#CCFBF1", color: "#0D9488" },
  part: { icon: "settings", bg: "#EDE9FE", color: "#7C3AED" },
  insurance: { icon: "shield", bg: "#E0E7FF", color: "#4338CA" },
  dealership: { icon: "map-pin", bg: "#F1F5F9", color: "#475569" },
  renewal: { icon: "refresh-cw", bg: "#D1FAE5", color: "#059669" },
};

export default function OrgActivityScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { orgs, activeOrgId } = useOrg();
  const currentOrgId = activeOrgId ?? orgs[0]?.id ?? null;
  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;
  const isAdmin = currentOrg?.role === "admin";

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const activityQuery = useQuery<ActivityItem[]>({
    queryKey: ["org-activity", currentOrgId],
    queryFn: () => apiGet<ActivityItem[]>(`/orgs/${currentOrgId}/activity`),
    enabled: currentOrgId != null && isAdmin,
  });

  const items = activityQuery.data ?? [];

  const carLabel = (car: ActivityCar | null): string => {
    if (!car) return t("orgActivity.unknownCar");
    return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
  };

  // Filter options derived from the feed itself.
  const cars: ActivityCar[] = React.useMemo(() => {
    const map = new Map<number, ActivityCar>();
    items.forEach((it) => {
      if (it.car && !map.has(it.carId)) map.set(it.carId, it.car);
    });
    return Array.from(map.values());
  }, [items]);

  const members = React.useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((it) => {
      if (it.byUserId != null && !map.has(it.byUserId)) {
        map.set(it.byUserId, it.byName ?? it.byEmail ?? t("orgActivity.unknownUser"));
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, i18n.language]);

  const filtered = items.filter((it) => {
    if (selectedCarId != null && it.carId !== selectedCarId) return false;
    if (selectedMemberId != null && it.byUserId !== selectedMemberId) return false;
    return true;
  });

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
      <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
        </Pressable>
        <LinearGradient
          colors={["#EEF2FF", "#C7D2FE", "#818CF8"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.iconBox}
        >
          <Feather name="activity" size={22} color="#312E81" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("orgActivity.title")}</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
            {currentOrg?.name ?? t("orgActivity.subtitle")}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderChip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[styles.chip, { backgroundColor: active ? C.tint : C.card, borderColor: active ? C.tint : C.border }]}
    >
      <Text style={[styles.chipText, { color: active ? "#fff" : C.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );

  let body: React.ReactNode;

  if (currentOrgId == null || !isAdmin) {
    body = (
      <EmptyState
        ionIcon="lock-closed-outline"
        title={t("orgActivity.title")}
        description={t("orgActivity.adminOnly")}
      />
    );
  } else if (activityQuery.isLoading) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  } else if (items.length === 0) {
    body = (
      <View style={styles.centered}>
        <Feather name="activity" size={40} color={C.textTertiary} />
        <Text style={[styles.emptyTitle, { color: C.text }]}>{t("orgActivity.emptyTitle")}</Text>
        <Text style={[styles.emptySub, { color: C.textSecondary }]}>{t("orgActivity.emptyDesc")}</Text>
      </View>
    );
  } else {
    body = (
      <>
        {/* Filters */}
        <View style={styles.filters}>
          {cars.length > 1 && (
            <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
              {renderChip("car-all", t("orgActivity.all"), selectedCarId == null, () => setSelectedCarId(null))}
              {cars.map((car) =>
                renderChip(`car-${car.id}`, carLabel(car), car.id === selectedCarId, () => setSelectedCarId(car.id)),
              )}
            </View>
          )}
          {members.length > 1 && (
            <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
              {renderChip("member-all", t("orgActivity.all"), selectedMemberId == null, () => setSelectedMemberId(null))}
              {members.map((m) =>
                renderChip(`member-${m.id}`, m.name, m.id === selectedMemberId, () => setSelectedMemberId(m.id)),
              )}
            </View>
          )}
        </View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((it) => {
            const meta = KIND_META[it.kind];
            const who = it.byName ?? it.byEmail ?? t("orgActivity.unknownUser");
            return (
              <LinearGradient
                key={`${it.kind}-${it.id}`}
                colors={isDark ? ["#283449", "#1E293B", "#16202F"] : ["#FFFFFF", "#F4F5F7", "#E6E8EB"]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: meta.color }, isRTL && { borderLeftWidth: 1, borderRightWidth: 4 }]}
              >
                <View style={[styles.cardHeader, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.badge, { backgroundColor: meta.bg }, isRTL && { flexDirection: "row-reverse" }]}>
                    <Feather name={meta.icon} size={11} color={meta.color} />
                    <Text style={[styles.badgeText, { color: meta.color }]}>{t(`orgActivity.kind.${it.kind}`)}</Text>
                  </View>
                  <View style={[styles.carTag, isRTL && { flexDirection: "row-reverse" }]}>
                    <MaterialCommunityIcons name={vehicleTypeIcon(it.car?.vehicleType)} size={13} color={C.textSecondary} />
                    <Text style={[styles.carNameHeader, { color: C.textSecondary }]} numberOfLines={1}>{carLabel(it.car)}</Text>
                  </View>
                </View>

                {!!it.title && (
                  <Text style={[styles.cardTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{it.title}</Text>
                )}

                <View style={[styles.metaRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.metaItem, isRTL && { flexDirection: "row-reverse" }]}>
                    <Feather name="user" size={12} color={C.textSecondary} />
                    <Text style={[styles.metaText, { color: C.textSecondary }]} numberOfLines={1}>
                      {t("orgActivity.loggedBy", { name: who })}
                    </Text>
                  </View>
                  <View style={[styles.metaItem, isRTL && { flexDirection: "row-reverse" }]}>
                    <Feather name="calendar" size={12} color={C.textSecondary} />
                    <Text style={[styles.metaText, { color: C.textSecondary }]}>{formatDate(it.date ?? it.createdAt)}</Text>
                  </View>
                </View>
              </LinearGradient>
            );
          })}
        </ScrollView>
      </>
    );
  }

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      {renderHeader()}
      {body}
      <BottomNav />
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
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#818CF8" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

  filters: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 220,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  listScroll: { flex: 1 },
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
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  carTag: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  carNameHeader: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  metaText: { fontSize: 12, fontFamily: "Inter_500Medium", flexShrink: 1 },
});
