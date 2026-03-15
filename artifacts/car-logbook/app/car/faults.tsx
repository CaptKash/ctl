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
import Colors from "@/constants/colors";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { RecordCard } from "@/components/ui/RecordCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";
import { SectionHeader } from "@/components/ui/SectionHeader";

type MalfunctionRecord = {
  id: number;
  carId: number;
  date: string;
  inputMethod: string;
  description: string;
  odometer?: number | null;
  phase: string;
};

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null };

const INPUT_METHODS = ["warning_message", "written"];
const INPUT_METHOD_LABELS: Record<string, string> = {
  warning_message: "Warning Message",
  written: "Written",
};

const PHASES = ["car_running", "car_started", "parking", "during_drive"];
const PHASE_LABELS: Record<string, string> = {
  car_running: "Car Running",
  car_started: "Car Started",
  parking: "Parking",
  during_drive: "During Drive",
};

export default function FaultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
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
  const carTitle = car
    ? car.nickname ?? `${car.year} ${car.make} ${car.model}`
    : "Car";

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Fault Records</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>
            {carTitle}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Fault Records"
          actionLabel="Add Fault"
          onAction={() => setShowAdd(true)}
        />

        {faultsQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 24 }} />
        ) : !faultsQuery.data || faultsQuery.data.length === 0 ? (
          <EmptyState
            icon="alert-triangle"
            title="No fault records"
            description="Log warning messages and malfunctions here."
            actionLabel="Add Fault"
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
              subtitle={`${INPUT_METHOD_LABELS[r.inputMethod] ?? r.inputMethod} · ${PHASE_LABELS[r.phase] ?? r.phase}`}
              rightText={r.date}
              rightSubtext={r.odometer != null ? `${r.odometer.toLocaleString()} km` : undefined}
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
          <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>Add Fault Record</Text>
            <Pressable onPress={() => setShowAdd(false)} hitSlop={12}>
              <Feather name="x" size={22} color={C.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[styles.sheetBody, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <FormField
                label="Date"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the fault…"
                multiline
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <SelectField
                label="Input Method"
                value={INPUT_METHOD_LABELS[inputMethod] ?? inputMethod}
                onSelect={(v) =>
                  setInputMethod(
                    Object.keys(INPUT_METHOD_LABELS).find((k) => INPUT_METHOD_LABELS[k] === v) ?? v
                  )
                }
                options={INPUT_METHODS.map((k) => INPUT_METHOD_LABELS[k])}
                placeholder="Select method…"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <SelectField
                label="Phase"
                value={PHASE_LABELS[phase] ?? phase}
                onSelect={(v) =>
                  setPhase(
                    Object.keys(PHASE_LABELS).find((k) => PHASE_LABELS[k] === v) ?? v
                  )
                }
                options={PHASES.map((k) => PHASE_LABELS[k])}
                placeholder="Select phase…"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Odometer (km)"
                value={odometer}
                onChangeText={setOdometer}
                placeholder="e.g. 54200"
                keyboardType="number-pad"
              />
            </View>

            {addMutation.isError && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Text style={[styles.errorText, { color: C.danger }]}>
                  Failed to save. Please check all required fields.
                </Text>
              </View>
            )}

            <PrimaryButton
              label="Save Fault"
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!description.trim()}
            />
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmId !== null}
        title="Delete Fault Record"
        message="This fault record will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => confirmId !== null && deleteMutation.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
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
