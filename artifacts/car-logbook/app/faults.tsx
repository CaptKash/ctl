import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useColors, useTheme } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatDate } from "@/lib/dateUtils";
import { apiDelete, apiGet } from "@/hooks/useApi";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DashboardIcon, DASHBOARD_LIGHTS } from "@/components/ui/DashboardLightIcons";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type FaultRecord = {
  id: number;
  carId: number;
  date: string;
  description: string;
  severity?: string | null;
  completed: boolean;
  dashboardMessage?: string | null;
  warningMessage?: string | null;
  car: Car | null;
};

const FAULT_BG = "#FEE2E2";
const FAULT_COLOR = "#DC2626";
const REPAIR_COLOR = "#D97706";

export default function FaultLogScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qc = useQueryClient();

  const carLabel = (car: Car | null) => {
    if (!car) return t("faults.unknownCar");
    return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
  };

  const { data: faults, isLoading } = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    onConfirm: () => void;
  }>({ visible: false, onConfirm: () => {} });

  const deleteMutation = useMutation({
    mutationFn: ({ carId, id }: { carId: number; id: number }) =>
      apiDelete(`/cars/${carId}/malfunctions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["malfunctions-all"] }),
  });

  const confirmDelete = (item: FaultRecord) => {
    setConfirmModal({
      visible: true,
      onConfirm: async () => {
        setConfirmModal((s) => ({ ...s, visible: false }));
        deleteMutation.mutate({ carId: item.carId, id: item.id });
      },
    });
  };

  const sorted = React.useMemo(() => {
    if (!faults) return [];
    return [...faults].sort((a, b) => b.date.localeCompare(a.date));
  }, [faults]);

  const active = sorted.filter((f) => !f.completed);
  const openCount = active.length;
  const totalCount = sorted.length;

  const renderCard = ({ item }: { item: FaultRecord }) => {
    const car = carLabel(item.car);
    return (
      <LinearGradient
        colors={isDark ? ["#283449", "#1E293B", "#16202F"] : ["#FFFFFF", "#F4F5F7", "#E6E8EB"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: FAULT_COLOR }, isRTL && { borderLeftWidth: 1, borderRightWidth: 4 }]}
      >
        <View style={[styles.cardHeader, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={[styles.faultBadge, { backgroundColor: FAULT_BG }, isRTL && { flexDirection: "row-reverse" }]}>
            <Feather name="alert-triangle" size={11} color={FAULT_COLOR} />
            <Text style={[styles.badgeText, { color: FAULT_COLOR }]}>{t("faults.faultBadge")}</Text>
          </View>
          <Text style={[styles.carName, { color: C.textSecondary, textAlign: isRTL ? "left" : "right" }]} numberOfLines={1}>{car}</Text>
        </View>

        <Text style={[styles.cardTitle, { color: C.text, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]} numberOfLines={2}>
          {item.description}
        </Text>

        {!!item.warningMessage && (
          <Text style={[styles.warningMsgText, { color: C.textSecondary, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]} numberOfLines={2}>
            <Text style={styles.warningMsgLabel}>{t("faults.dashboardMessageLabel")}</Text>
            {item.warningMessage}
          </Text>
        )}

        {!!item.dashboardMessage && (() => {
          const ids = item.dashboardMessage.split(",").map((s) => s.trim()).filter(Boolean);
          const lights = DASHBOARD_LIGHTS.filter((l) => ids.includes(l.id));
          if (!lights.length) return null;
          return (
            <View style={styles.iconsRow}>
              {lights.map((l) => (
                <DashboardIcon key={l.id} id={l.id} color={l.warningColor} size={20} />
              ))}
            </View>
          );
        })()}

        <View style={[styles.cardFooter, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={[styles.footerLeft, isRTL && { flexDirection: "row-reverse" }]}>
            <Feather name="calendar" size={12} color={C.textTertiary} />
            <Text style={[styles.footerText, { color: C.textTertiary }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={[styles.footerActions, isRTL && { flexDirection: "row-reverse" }]}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/maintenance/form",
                  params: {
                    carId: String(item.carId),
                    faultDescription: item.description,
                    faultId: String(item.id),
                  },
                } as any)
              }
            >
              <MetalIcon icon="tool" color={REPAIR_COLOR} size={14} containerSize={30} radius={8} />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item)}
            >
              <MetalIcon icon="trash-2" color={FAULT_COLOR} size={14} containerSize={30} radius={8} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <LinearGradient
            colors={["#FEE2E2", "#FCA5A5", "#DC2626"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#991B1B" }]}
          >
            <Feather name="alert-triangle" size={22} color="#7F1D1D" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("faults.logTitle")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {totalCount === 0 ? t("faults.noFaults") : t("faults.summary", { open: openCount, total: totalCount })}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#DC2626" />
        </View>
      ) : totalCount === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon="check-circle"
            title={t("faults.noFaults")}
            description={t("faults.logEmptyDesc")}
          />
          <View style={styles.emptyBtnWrap}>
            <PrimaryButton
              label={t("faults.logFault")}
              onPress={() => router.push("/malfunction/add" as any)}
              variant="metallic-blue"
              icon="plus"
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {active.length === 0 ? (
            <View style={[styles.emptyActive, { backgroundColor: C.card, borderColor: C.border }, isRTL && { flexDirection: "row-reverse" }]}>
              <Feather name="check-circle" size={20} color="#059669" />
              <Text style={[styles.emptyActiveText, { color: C.textSecondary }]}>{t("faults.allResolved")}</Text>
            </View>
          ) : (
            active.map((item) => (
              <View key={item.id} style={{ marginBottom: 10 }}>
                {renderCard({ item })}
              </View>
            ))
          )}

          <PrimaryButton
            label={t("faults.logFault")}
            onPress={() => router.push("/malfunction/add" as any)}
            variant="metallic-blue"
            icon="plus"
          />
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmModal.visible}
        title={t("faults.deleteFaultTitle")}
        message={t("faults.deleteMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((s) => ({ ...s, visible: false }))}
      />
      <BottomNav active="faults" />
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBtnWrap: { alignSelf: "stretch", paddingHorizontal: 24, marginTop: 24 },
  listContent: { padding: 16 },

  card: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  carName: { fontSize: 13, fontFamily: "Inter_600SemiBold", flexShrink: 1, textAlign: "right" },
  faultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, flexWrap: "wrap" },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footerActions: { flexDirection: "row", gap: 8 },
  emptyActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyActiveText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  warningMsgText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  warningMsgLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  iconsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", alignSelf: "flex-start", backgroundColor: "#4B5563", borderRadius: 10, padding: 10 },
});
