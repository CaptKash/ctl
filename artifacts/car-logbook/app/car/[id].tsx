import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import BottomNav from "@/components/ui/BottomNav";
import { formatDate } from "@/lib/dateUtils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RecordCard } from "@/components/ui/RecordCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiDelete } from "@/hooks/useApi";

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

type InspectionRecord = {
  id: number;
  carId: number;
  date: string;
  place?: string | null;
  results?: string | null;
  cost?: number | null;
  requiredRepairs?: string | null;
  nextInspectionDate?: string | null;
};


export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", onConfirm: () => {} });

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

  const inspectionsQuery = useQuery<InspectionRecord[]>({
    queryKey: ["inspections", carId],
    queryFn: () => apiGet<InspectionRecord[]>(`/cars/${carId}/inspections`),
  });

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

      {/* Stats Strip */}
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
        <SectionHeader title="Faults" />

        {faultsQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 16 }} />
        ) : !faultsQuery.data || faultsQuery.data.filter((r) => !r.completed).length === 0 ? (
          <EmptyState
            icon="alert-triangle"
            title="No fault records"
            description="Faults logged from the Log Event page will appear here."
          />
        ) : (
          faultsQuery.data.filter((r) => !r.completed).map((r) => (
            <View key={r.id} style={[styles.faultCard, { backgroundColor: C.card, borderColor: "#DC2626" }]}>
              <View style={styles.faultCardHeader}>
                <View style={[styles.faultBadge, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="alert-triangle" size={11} color="#DC2626" />
                  <Text style={[styles.faultBadgeText, { color: "#DC2626" }]}>Fault</Text>
                </View>
                <Text style={[styles.faultDate, { color: C.textTertiary }]}>{formatDate(r.date)}</Text>
              </View>
              <Text style={[styles.faultDesc, { color: C.text }]} numberOfLines={3}>
                {r.description}
              </Text>
              <View style={styles.faultFooter}>
                <View style={{ flex: 1 }} />
                <View style={styles.faultActions}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/maintenance/form",
                        params: { carId: String(carId), faultDescription: r.description, faultId: String(r.id) },
                      } as any)
                    }
                    style={[styles.faultBtn, { backgroundColor: "#FEE2E2", borderColor: "#DC2626" }]}
                  >
                    <Feather name="tool" size={14} color="#DC2626" />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(`/cars/${carId}/malfunctions/${r.id}`, "malfunctions")}
                    style={[styles.faultBtn, { backgroundColor: "#FEE2E2", borderColor: "#DC2626" }]}
                  >
                    <Feather name="trash-2" size={14} color="#DC2626" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Maintenance */}
        <SectionHeader title="Maintenance" />

        {maintenanceQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 16 }} />
        ) : !maintenanceQuery.data || maintenanceQuery.data.length === 0 ? (
          <EmptyState
            icon="tool"
            title="No maintenance records"
            description="Maintenance logged from the Log Event page will appear here."
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
              onDelete={() => confirmDelete(`/cars/${carId}/maintenance/${r.id}`, "maintenance")}
            />
          ))
        )}

        {/* Inspections */}
        <SectionHeader title="Inspections" />

        {inspectionsQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 16 }} />
        ) : !inspectionsQuery.data || inspectionsQuery.data.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No inspection records"
            description="Inspections logged from the Log Event page will appear here."
          />
        ) : (
          inspectionsQuery.data.map((r) => (
            <RecordCard
              key={r.id}
              icon="clipboard"
              iconColor="#D97706"
              iconBg="#FEF3C7"
              title={r.results ?? "Inspection"}
              subtitle={`${formatDate(r.date)}${r.place ? ` · ${r.place}` : ""}`}
              rightText={r.cost != null ? `$${r.cost.toFixed(2)}` : undefined}
              rightSubtext={r.nextInspectionDate ? `Next: ${formatDate(r.nextInspectionDate)}` : undefined}
              onDelete={() => confirmDelete(`/cars/${carId}/inspections/${r.id}`, "inspections")}
            />
          ))
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Delete"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((s) => ({ ...s, visible: false }))}
        destructive
      />
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

  faultCard: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 10,
  },
  faultCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  faultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  faultBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  faultDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  faultDesc: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  faultFooter: { flexDirection: "row", alignItems: "center" },
  faultActions: { flexDirection: "row", gap: 8 },
  faultBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
});
