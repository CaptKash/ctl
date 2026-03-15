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
import BottomNav from "@/components/ui/BottomNav";
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
};

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null };

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
  const C = Colors.light;
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

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

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
          <Text style={[styles.headerTitle, { color: C.text }]}>Maintenance</Text>
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
          title="Maintenance Records"
          actionLabel="Add Entry"
          onAction={() => setShowAdd(true)}
        />

        {maintenanceQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 24 }} />
        ) : !maintenanceQuery.data || maintenanceQuery.data.length === 0 ? (
          <EmptyState
            icon="tool"
            title="No maintenance records"
            description="Log oil changes, tyre rotations, brake service, and more."
            actionLabel="Add Entry"
            onAction={() => setShowAdd(true)}
          />
        ) : (
          maintenanceQuery.data.map((r) => (
            <RecordCard
              key={r.id}
              icon="tool"
              iconColor={Colors.light.warning}
              iconBg={Colors.light.warningLight}
              title={r.description}
              subtitle={`${r.type} · ${formatDate(r.date)}${r.shop ? ` · ${r.shop}` : ""}`}
              rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
              rightSubtext={r.mileage != null ? `${r.mileage.toLocaleString()} km` : undefined}
              onDelete={() => setConfirmId(r.id)}
            />
          ))
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
            <Text style={[styles.sheetTitle, { color: C.text }]}>Add Maintenance</Text>
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
                label="Type"
                value={mType}
                onSelect={setMType}
                options={MAINTENANCE_TYPES}
                placeholder="Select type…"
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Description"
                value={mDesc}
                onChangeText={setMDesc}
                placeholder="What was done?"
                multiline
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <DatePickerField
                label="Date"
                value={mDate}
                onChange={setMDate}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Mileage (km)"
                value={mMileage}
                onChangeText={setMMileage}
                placeholder="e.g. 54200"
                keyboardType="number-pad"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Cost"
                value={mCost}
                onChangeText={setMCost}
                placeholder="e.g. 120.00"
                keyboardType="decimal-pad"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Shop / Technician"
                value={mShop}
                onChangeText={setMShop}
                placeholder="e.g. City Garage"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <DatePickerField
                label="Next Due Date"
                value={mNextDate}
                onChange={setMNextDate}
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
              label="Save Entry"
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!mType.trim() || !mDesc.trim()}
            />
          </ScrollView>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmId !== null}
        title="Delete Maintenance Record"
        message="This maintenance record will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => confirmId !== null && deleteMutation.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
        destructive
      />
      <BottomNav />
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
