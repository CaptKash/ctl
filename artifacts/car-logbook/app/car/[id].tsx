import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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
import Colors from "@/constants/colors";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RecordCard } from "@/components/ui/RecordCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  licenseValidUntil?: string | null;
  vin?: string | null;
  insuredWith?: string | null;
  insuredUntil?: string | null;
  mileage?: number | null;
  notes?: string | null;
};

type MalfunctionRecord = {
  id: number;
  carId: number;
  date: string;
  inputMethod: string;
  description: string;
  odometer?: number | null;
  phase: string;
  completed: boolean;
};

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

const INPUT_METHOD_LABELS: Record<string, string> = {
  warning_message: "Warning Message",
  written: "Written",
};
const INPUT_METHODS = Object.keys(INPUT_METHOD_LABELS);

const PHASE_LABELS: Record<string, string> = {
  car_running: "Car Running",
  car_started: "Car Started",
  parking: "Parking",
  during_drive: "During Drive",
};
const PHASES = Object.keys(PHASE_LABELS);

const MAINTENANCE_TYPES = [
  "Oil Change", "Tyre Rotation", "Tyre Replacement", "Brake Service",
  "Battery Replacement", "Air Filter", "Transmission Service", "Coolant Flush",
  "Spark Plugs", "Timing Belt", "Inspection", "Other",
];

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Add sheets
  const [showAddFault, setShowAddFault] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);

  // Fault form
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0]);
  const [fDesc, setFDesc] = useState("");
  const [fInputMethod, setFInputMethod] = useState("written");
  const [fOdometer, setFOdometer] = useState("");
  const [fPhase, setFPhase] = useState("during_drive");

  // Maintenance form
  const [mType, setMType] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mDate, setMDate] = useState(new Date().toISOString().split("T")[0]);
  const [mMileage, setMMileage] = useState("");
  const [mCost, setMCost] = useState("");
  const [mShop, setMShop] = useState("");
  const [mNextDate, setMNextDate] = useState("");

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", onConfirm: () => {} });

  // Queries
  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  const faultsQuery = useQuery<MalfunctionRecord[]>({
    queryKey: ["malfunctions", carId],
    queryFn: () => apiGet<MalfunctionRecord[]>(`/cars/${carId}/malfunctions`),
  });

  const maintenanceQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance", carId],
    queryFn: () => apiGet<MaintenanceRecord[]>(`/cars/${carId}/maintenance`),
  });

  // Mutations — Add Fault
  const addFaultMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/malfunctions`, {
        carId,
        date: fDate,
        description: fDesc,
        inputMethod: fInputMethod,
        odometer: fOdometer ? parseInt(fOdometer) : undefined,
        phase: fPhase,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["malfunctions", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddFault(false);
      setFDesc(""); setFOdometer("");
      setFDate(new Date().toISOString().split("T")[0]);
      setFInputMethod("written"); setFPhase("during_drive");
    },
  });

  // Mutations — Add Maintenance
  const addMaintenanceMutation = useMutation({
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAddMaintenance(false);
      setMType(""); setMDesc(""); setMCost(""); setMShop(""); setMNextDate(""); setMMileage("");
      setMDate(new Date().toISOString().split("T")[0]);
    },
  });

  // Mark fault as solved
  const markSolved = (recordId: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    apiPost(`/cars/${carId}/events/complete`, { recordType: "malfunction", recordId })
      .then(() => qc.invalidateQueries({ queryKey: ["malfunctions", carId] }));
  };

  // Delete record
  const confirmDelete = (path: string, queryKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmModal({
      visible: true,
      title: "Delete Record",
      message: "This record will be permanently deleted.",
      onConfirm: async () => {
        setConfirmModal((s) => ({ ...s, visible: false }));
        await apiDelete(path);
        qc.invalidateQueries({ queryKey: [queryKey, carId] });
      },
    });
  };

  const car = carQuery.data;

  if (carQuery.isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  if (!car) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <Text style={{ color: C.text }}>Car not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.carName, { color: C.text }]} numberOfLines={1}>
            {car.nickname ?? `${car.year} ${car.make} ${car.model}`}
          </Text>
          <Text style={[styles.plate, { color: C.textSecondary }]} numberOfLines={1}>
            {car.nickname ? `${car.year} ${car.make} ${car.model}` : car.licensePlate ?? ""}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/car/edit", params: { id: String(carId) } });
            }}
            hitSlop={8}
            style={[styles.headerBtn, { backgroundColor: C.backgroundTertiary }]}
          >
            <Feather name="edit-2" size={16} color={C.text} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push({ pathname: "/report/[id]", params: { id: String(carId) } });
            }}
            hitSlop={8}
            style={[styles.headerBtn, { backgroundColor: C.infoLight }]}
          >
            <Feather name="file-text" size={16} color={C.info} />
          </Pressable>
        </View>
      </View>

      {/* Car Stats Strip */}
      <View style={[styles.statsStrip, { backgroundColor: C.card }]}>
        {car.mileage != null && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{car.mileage.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>km</Text>
          </View>
        )}
        {car.vin && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]} numberOfLines={1}>{car.vin.slice(-6)}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>VIN</Text>
          </View>
        )}
        {car.color && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{car.color}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Color</Text>
          </View>
        )}
        {car.licensePlate && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: C.text }]}>{car.licensePlate}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Plate</Text>
          </View>
        )}
      </View>

      {/* Records */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentPadding, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Faults */}
        <SectionHeader
          title="Faults"
          actionLabel="Add Fault"
          onAction={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddFault(true);
          }}
        />

        {faultsQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 16 }} />
        ) : !faultsQuery.data || faultsQuery.data.length === 0 ? (
          <EmptyState
            icon="alert-triangle"
            title="No fault records"
            description="Log warning messages and malfunctions here."
            actionLabel="Add Fault"
            onAction={() => setShowAddFault(true)}
          />
        ) : (
          faultsQuery.data.map((r) => (
            <RecordCard
              key={r.id}
              icon="alert-triangle"
              iconColor={r.completed ? "#16A34A" : "#DC2626"}
              iconBg={r.completed ? "#DCFCE7" : "#FEE2E2"}
              title={r.description}
              subtitle={`${INPUT_METHOD_LABELS[r.inputMethod] ?? r.inputMethod} · ${PHASE_LABELS[r.phase] ?? r.phase}`}
              rightText={r.date}
              rightSubtext={r.odometer != null ? `${r.odometer.toLocaleString()} km` : undefined}
              onComplete={r.completed ? undefined : () => markSolved(r.id)}
              onDelete={() => confirmDelete(`/cars/${carId}/malfunctions/${r.id}`, "malfunctions")}
            />
          ))
        )}

        {/* Maintenance */}
        <SectionHeader
          title="Maintenance"
          actionLabel="Add Entry"
          onAction={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddMaintenance(true);
          }}
        />

        {maintenanceQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 16 }} />
        ) : !maintenanceQuery.data || maintenanceQuery.data.length === 0 ? (
          <EmptyState
            icon="tool"
            title="No maintenance records"
            description="Log oil changes, tyre rotations, brake service, and more."
            actionLabel="Add Entry"
            onAction={() => setShowAddMaintenance(true)}
          />
        ) : (
          maintenanceQuery.data.map((r) => (
            <RecordCard
              key={r.id}
              icon="tool"
              iconColor={Colors.light.warning}
              iconBg={Colors.light.warningLight}
              title={r.description}
              subtitle={`${r.type} · ${r.date}${r.shop ? ` · ${r.shop}` : ""}`}
              rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
              rightSubtext={r.mileage != null ? `${r.mileage.toLocaleString()} km` : undefined}
              onDelete={() => confirmDelete(`/cars/${carId}/maintenance/${r.id}`, "maintenance")}
            />
          ))
        )}
      </ScrollView>

      {/* Add Fault Sheet */}
      <BottomSheet visible={showAddFault} onClose={() => setShowAddFault(false)} title="Add Fault">
        <FormField label="Date" value={fDate} onChangeText={setFDate} placeholder="YYYY-MM-DD" />
        <FormField label="Description" value={fDesc} onChangeText={setFDesc} placeholder="Describe the fault…" multiline required />
        <SelectField
          label="Input Method"
          value={INPUT_METHOD_LABELS[fInputMethod] ?? fInputMethod}
          onSelect={(v) => setFInputMethod(Object.keys(INPUT_METHOD_LABELS).find((k) => INPUT_METHOD_LABELS[k] === v) ?? v)}
          options={INPUT_METHODS.map((k) => INPUT_METHOD_LABELS[k])}
          placeholder="Select method…"
        />
        <SelectField
          label="Phase"
          value={PHASE_LABELS[fPhase] ?? fPhase}
          onSelect={(v) => setFPhase(Object.keys(PHASE_LABELS).find((k) => PHASE_LABELS[k] === v) ?? v)}
          options={PHASES.map((k) => PHASE_LABELS[k])}
          placeholder="Select phase…"
        />
        <FormField label="Odometer (km)" value={fOdometer} onChangeText={setFOdometer} placeholder="e.g. 54200" keyboardType="number-pad" />
        <PrimaryButton label="Save Fault" onPress={() => addFaultMutation.mutate()} loading={addFaultMutation.isPending} disabled={!fDesc.trim()} />
      </BottomSheet>

      {/* Add Maintenance Sheet */}
      <BottomSheet visible={showAddMaintenance} onClose={() => setShowAddMaintenance(false)} title="Add Maintenance">
        <SelectField
          label="Type"
          value={mType}
          onSelect={setMType}
          options={MAINTENANCE_TYPES}
          placeholder="Select type…"
          required
        />
        <FormField label="Description" value={mDesc} onChangeText={setMDesc} placeholder="Describe the work done" required />
        <FormField label="Date" value={mDate} onChangeText={setMDate} placeholder="YYYY-MM-DD" />
        <FormField label="Mileage (km)" value={mMileage} onChangeText={setMMileage} placeholder="Current odometer" keyboardType="number-pad" />
        <FormField label="Cost ($)" value={mCost} onChangeText={setMCost} placeholder="Total cost" keyboardType="decimal-pad" />
        <FormField label="Shop / Technician" value={mShop} onChangeText={setMShop} placeholder="Where was it done?" />
        <FormField label="Next Due Date" value={mNextDate} onChangeText={setMNextDate} placeholder="YYYY-MM-DD" />
        <PrimaryButton label="Save Record" onPress={() => addMaintenanceMutation.mutate()} loading={addMaintenanceMutation.isPending} disabled={!mType || !mDesc} />
      </BottomSheet>

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Delete"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((s) => ({ ...s, visible: false }))}
        destructive
      />
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
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  carName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  plate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statsStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    gap: 24,
    shadowColor: "rgba(0,0,0,0.04)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: { alignItems: "center", gap: 2 },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  content: { flex: 1 },
  contentPadding: {
    padding: 16,
    gap: 0,
  },
});
