import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { formatDate } from "@/lib/dateUtils";
import { SelectField } from "@/components/ui/SelectField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { RecordCard } from "@/components/ui/RecordCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";
import { useCar } from "@/hooks/useCar";
import { useOrgMemberNames } from "@/hooks/useOrgMemberNames";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { isHourBased } from "@/lib/vehicleTypes";

type MaintenanceRecord = {
  id: number;
  carId: number;
  type: string;
  description: string;
  date: string;
  mileage?: number | null;
  cost?: number | null;
  shop?: string | null;
  nextDueDate?: string | null;
  createdByUserId?: number | null;
};

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null; usageUnit?: string | null };

const MAINTENANCE_TYPES = [
  "Oil Change",
  "Tyre Rotation",
  "Tyre Replacement",
  "Brake Service",
  "Battery Replacement",
  "Air Filter",
  "Transmission Service",
  "Coolant Flush",
  "Spark Plugs",
  "Timing Belt",
  "Inspection",
  "Other",
];

export default function MaintenanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t } = useTranslation();
  const memberName = useOrgMemberNames();
  const { unit } = useDistanceUnit();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [showAdd, setShowAdd] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [mType, setMType] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().split("T")[0]);
  const [mMileage, setMMileage] = useState("");
  const [mCost, setMCost] = useState("");
  const [mShop, setMShop] = useState("");
  const [mNextDate, setMNextDate] = useState("");

  const carQuery = useCar<Car>(carId);

  const maintenanceQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance", carId],
    queryFn: () => apiGet<MaintenanceRecord[]>(`/cars/${carId}/maintenance`),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/maintenance`, {
        type: mType,
        description: mDesc,
        date: mDate,
        mileage: mMileage ? parseInt(mMileage) : undefined,
        cost: mCost ? parseFloat(mCost) : undefined,
        shop: mShop || undefined,
        nextDueDate: mNextDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      setMType("");
      setMDesc("");
      setMCost("");
      setMShop("");
      setMNextDate("");
      setMMileage("");
      setMDate(new Date().toISOString().split("T")[0]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: number) =>
      apiDelete(`/cars/${carId}/maintenance/${recordId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmId(null);
    },
  });

  const car = carQuery.data;
  const usageUnitText = isHourBased(car?.usageUnit) ? t("units.hours") : unit;
  const carTitle = car
    ? car.nickname ?? `${car.year} ${car.make} ${car.model}`
    : t("carMaintenance.carFallback");

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#FEF3C7", "#FCD34D", "#D97706"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#92400E" }]}
          >
            <Feather name="tool" size={22} color="#78350F" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t("carMaintenance.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>{carTitle}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title={t("carMaintenance.logsTitle")}
          actionLabel={t("carMaintenance.addEntry")}
          onAction={() => setShowAdd(true)}
        />

        {maintenanceQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 24 }} />
        ) : !maintenanceQuery.data || maintenanceQuery.data.length === 0 ? (
          <EmptyState
            icon="tool"
            title={t("carMaintenance.emptyTitle")}
            description={t("carMaintenance.emptyDesc")}
            actionLabel={t("carMaintenance.addEntry")}
            onAction={() => setShowAdd(true)}
          />
        ) : (
          maintenanceQuery.data.map((r) => {
            const by = memberName(r.createdByUserId);
            return (
            <RecordCard
              key={r.id}
              icon="tool"
              iconColor={useColors().warning}
              iconBg={useColors().warningLight}
              title={r.description}
              subtitle={`${r.type} · ${formatDate(r.date)}${r.shop ? ` · ${r.shop}` : ""}`}
              metaText={by ? t("common.loggedBy", { name: by }) : undefined}
              rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
              rightSubtext={r.mileage != null ? `${r.mileage.toLocaleString()} ${usageUnitText}` : undefined}
              onDelete={() => setConfirmId(r.id)}
            />
            );
          })
        )}
      </ScrollView>

      {/* Add Maintenance Sheet */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={[styles.sheet, { backgroundColor: C.backgroundSecondary }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>{t("carMaintenance.sheetTitle")}</Text>
            <Pressable onPress={() => setShowAdd(false)} hitSlop={12}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <SelectField
                label={t("carMaintenance.typeLabel")}
                value={mType}
                onSelect={setMType}
                options={MAINTENANCE_TYPES}
                placeholder={t("carMaintenance.typePlaceholder")}
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("carMaintenance.descLabel")}
                value={mDesc}
                onChangeText={setMDesc}
                placeholder={t("carMaintenance.descPlaceholder")}
                multiline
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <DatePickerField
                label={t("carMaintenance.dateLabel")}
                value={mDate}
                onChange={setMDate}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("carMaintenance.mileageLabel", { unit: usageUnitText })}
                value={mMileage}
                onChangeText={setMMileage}
                placeholder={t("carMaintenance.mileagePlaceholder")}
                keyboardType="number-pad"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("carMaintenance.costLabel")}
                value={mCost}
                onChangeText={setMCost}
                placeholder={t("carMaintenance.costPlaceholder")}
                keyboardType="decimal-pad"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("carMaintenance.shopLabel")}
                value={mShop}
                onChangeText={setMShop}
                placeholder={t("carMaintenance.shopPlaceholder")}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <DatePickerField
                label={t("carMaintenance.nextDueLabel")}
                value={mNextDate}
                onChange={setMNextDate}
              />
            </View>

            {addMutation.isError && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Text style={[styles.errorText, { color: C.danger }]}>
                  {t("carMaintenance.saveError")}
                </Text>
              </View>
            )}

            <PrimaryButton
              label={t("carMaintenance.saveEntry")}
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!mType.trim() || !mDesc.trim()}
            />
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmId !== null}
        title={t("carMaintenance.deleteTitle")}
        message={t("carMaintenance.deleteMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={() => confirmId !== null && deleteMutation.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
        destructive
      />
      <BottomNav />
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {},
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  content: { padding: 16 },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetBody: { padding: 20, gap: 16 },
  fieldGroup: { borderRadius: 14, padding: 16, gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -4 },
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
