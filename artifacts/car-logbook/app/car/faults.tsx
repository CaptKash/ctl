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
import { MetalIcon } from "@/components/ui/MetalIcon";
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
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { isHourBased } from "@/lib/vehicleTypes";

type MalfunctionRecord = {
  id: number;
  carId: number;
  date: string;
  inputMethod: string;
  description: string;
  odometer?: number | null;
  phase: string;
};

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null; usageUnit?: string | null };

const INPUT_METHODS = ["warning_message", "written"];
const PHASES = ["car_running", "car_started", "parking", "during_drive"];

export default function FaultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const methodLabel = (k: string) => t(`faults.methods.${k}`);
  const phaseLabel = (k: string) => t(`faults.phases.${k}`);
  const { unit } = useDistanceUnit();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [showAdd, setShowAdd] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [inputMethod, setInputMethod] = useState("written");
  const [odometer, setOdometer] = useState("");
  const [phase, setPhase] = useState("during_drive");

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  const faultsQuery = useQuery<MalfunctionRecord[]>({
    queryKey: ["malfunctions", carId],
    queryFn: () => apiGet<MalfunctionRecord[]>(`/cars/${carId}/malfunctions`),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/malfunctions`, {
        carId,
        date,
        description,
        inputMethod,
        odometer: odometer ? parseInt(odometer) : undefined,
        phase,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["malfunctions", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      setDescription("");
      setOdometer("");
      setDate(new Date().toISOString().split("T")[0]);
      setInputMethod("written");
      setPhase("during_drive");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: number) =>
      apiDelete(`/cars/${carId}/malfunctions/${recordId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["malfunctions", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmId(null);
    },
  });

  const car = carQuery.data;
  const usageUnitText = isHourBased(car?.usageUnit) ? t("units.hours") : unit;
  const carTitle = car
    ? car.nickname ?? `${car.year} ${car.make} ${car.model}`
    : t("faults.carFallback");

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="alert-triangle" color="#DC2626" bg="#FEE2E2" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("faults.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>{carTitle}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title={t("faults.title")}
          actionLabel={t("faults.add")}
          onAction={() => setShowAdd(true)}
        />

        {faultsQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 24 }} />
        ) : !faultsQuery.data || faultsQuery.data.length === 0 ? (
          <EmptyState
            icon="alert-triangle"
            title={t("faults.emptyTitle")}
            description={t("faults.emptyDesc")}
            actionLabel={t("faults.add")}
            onAction={() => setShowAdd(true)}
          />
        ) : (
          faultsQuery.data.map((r) => (
            <RecordCard
              key={r.id}
              icon="alert-triangle"
              iconColor="#DC2626"
              iconBg="#FEE2E2"
              title={r.description}
              subtitle={[
                methodLabel(r.inputMethod),
                r.phase ? phaseLabel(r.phase) : null,
              ].filter(Boolean).join(" · ")}
              rightText={formatDate(r.date)}
              rightSubtext={r.odometer != null ? `${r.odometer.toLocaleString()} ${usageUnitText}` : undefined}
              onDelete={() => setConfirmId(r.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Add Fault Sheet */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={[styles.sheet, { backgroundColor: C.backgroundSecondary }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: C.border }, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>{t("faults.addTitle")}</Text>
            <Pressable onPress={() => setShowAdd(false)} hitSlop={12}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <DatePickerField
                label={t("faults.date")}
                value={date}
                onChange={setDate}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("faults.description")}
                value={description}
                onChangeText={setDescription}
                placeholder={t("faults.descriptionPlaceholder")}
                multiline
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <SelectField
                label={t("faults.inputMethod")}
                value={methodLabel(inputMethod)}
                onSelect={(v) =>
                  setInputMethod(INPUT_METHODS.find((k) => methodLabel(k) === v) ?? v)
                }
                options={INPUT_METHODS.map((k) => methodLabel(k))}
                placeholder={t("faults.selectMethod")}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <SelectField
                label={t("faults.phase")}
                value={phaseLabel(phase)}
                onSelect={(v) =>
                  setPhase(PHASES.find((k) => phaseLabel(k) === v) ?? v)
                }
                options={PHASES.map((k) => phaseLabel(k))}
                placeholder={t("faults.selectPhase")}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("faults.odometer", { unit: usageUnitText })}
                value={odometer}
                onChangeText={setOdometer}
                placeholder={t("faults.odometerPlaceholder")}
                keyboardType="number-pad"
              />
            </View>

            {addMutation.isError && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Text style={[styles.errorText, { color: C.danger }]}>
                  {t("faults.saveError")}
                </Text>
              </View>
            )}

            <PrimaryButton
              label={t("faults.save")}
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!description.trim()}
            />
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmId !== null}
        title={t("faults.deleteTitle")}
        message={t("faults.deleteMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={() => confirmId !== null && deleteMutation.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
        confirmStyle="destructive"
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
  content: { padding: 16, gap: 0 },
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
