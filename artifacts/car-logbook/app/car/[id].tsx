import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiDelete } from "@/hooks/useApi";
import { DashboardIcon, DASHBOARD_LIGHTS } from "@/components/ui/DashboardLightIcons";

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
  photos?: string | null;
};

type FaultRecord = {
  id: number;
  carId: number;
  date: string;
  description: string;
  completed: boolean;
  dashboardMessage?: string | null;
  warningMessage?: string | null;
};

type MaintenanceRecord = {
  id: number;
  carId: number;
  type: string;
  description: string;
  date: string;
  cost?: number | null;
  shop?: string | null;
};

type InspectionRecord = {
  id: number;
  carId: number;
  date: string;
  place?: string | null;
  results?: string | null;
  cost?: number | null;
  nextInspectionDate?: string | null;
};

type EventItem =
  | { kind: "fault"; data: FaultRecord }
  | { kind: "maintenance"; data: MaintenanceRecord }
  | { kind: "inspection"; data: InspectionRecord };

const EVENT_META = {
  fault:       { label: "Fault",       icon: "alert-triangle" as const, bg: "#FEE2E2", color: "#DC2626" },
  maintenance: { label: "Maintenance", icon: "tool" as const,           bg: "#FEF3C7", color: "#D97706" },
  inspection:  { label: "Inspection",  icon: "clipboard" as const,      bg: "#FEF3C7", color: "#D97706" },
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

  const faultsQuery = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions", carId],
    queryFn: () => apiGet<FaultRecord[]>(`/cars/${carId}/malfunctions`),
  });

  const maintenanceQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance", carId],
    queryFn: () => apiGet<MaintenanceRecord[]>(`/cars/${carId}/maintenance`),
  });

  const inspectionsQuery = useQuery<InspectionRecord[]>({
    queryKey: ["inspections", carId],
    queryFn: () => apiGet<InspectionRecord[]>(`/cars/${carId}/inspections`),
  });

  const events: EventItem[] = React.useMemo(() => {
    const list: EventItem[] = [];
    (faultsQuery.data ?? [])
      .filter((r) => !r.completed)
      .forEach((r) => list.push({ kind: "fault", data: r }));
    (maintenanceQuery.data ?? []).forEach((r) => list.push({ kind: "maintenance", data: r }));
    (inspectionsQuery.data ?? []).forEach((r) => list.push({ kind: "inspection", data: r }));
    return list.sort((a, b) => b.data.date.localeCompare(a.data.date));
  }, [faultsQuery.data, maintenanceQuery.data, inspectionsQuery.data]);

  const isLoading = faultsQuery.isLoading || maintenanceQuery.isLoading || inspectionsQuery.isLoading;

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

  const renderEvent = (ev: EventItem) => {
    const meta = EVENT_META[ev.kind];
    const key = `${ev.kind}-${ev.data.id}`;

    if (ev.kind === "fault") {
      const r = ev.data;
      return (
        <View key={key} style={[styles.card, { backgroundColor: C.card, borderColor: meta.color }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Feather name={meta.icon} size={11} color={meta.color} />
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.dateText, { color: C.textTertiary }]}>{formatDate(r.date)}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={3}>{r.description}</Text>
          {!!r.warningMessage && (
            <Text style={[styles.warningMsgText, { color: C.textSecondary }]} numberOfLines={2}>
              <Text style={styles.warningMsgLabel}>Dashboard message: </Text>
              {r.warningMessage}
            </Text>
          )}
          {!!r.dashboardMessage && (() => {
            const ids = r.dashboardMessage.split(",").map((s) => s.trim()).filter(Boolean);
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
          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }} />
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => router.push({
                  pathname: "/maintenance/form",
                  params: { carId: String(carId), faultDescription: r.description, faultId: String(r.id) },
                } as any)}
                style={[styles.actionBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}
              >
                <Feather name="tool" size={14} color={meta.color} />
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(`/cars/${carId}/malfunctions/${r.id}`, "malfunctions")}
                style={[styles.actionBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}
              >
                <Feather name="trash-2" size={14} color={meta.color} />
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    if (ev.kind === "maintenance") {
      const r = ev.data;
      return (
        <View key={key} style={[styles.card, { backgroundColor: C.card, borderColor: meta.color }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Feather name={meta.icon} size={11} color={meta.color} />
              <Text style={[styles.badgeText, { color: meta.color }]}>{r.type || meta.label}</Text>
            </View>
            <Text style={[styles.dateText, { color: C.textTertiary }]}>{formatDate(r.date)}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={3}>{r.description}</Text>
          {(r.shop || r.cost != null) && (
            <View style={styles.cardMeta}>
              {r.shop && (
                <>
                  <Feather name="map-pin" size={12} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{r.shop}</Text>
                </>
              )}
              {r.cost != null && (
                <>
                  {r.shop && <View style={styles.metaDot} />}
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>${r.cost.toFixed(2)}</Text>
                </>
              )}
            </View>
          )}
          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => confirmDelete(`/cars/${carId}/maintenance/${r.id}`, "maintenance")}
              style={[styles.actionBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}
            >
              <Feather name="trash-2" size={14} color={meta.color} />
            </Pressable>
          </View>
        </View>
      );
    }

    if (ev.kind === "inspection") {
      const r = ev.data;
      return (
        <View key={key} style={[styles.card, { backgroundColor: C.card, borderColor: meta.color }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Feather name={meta.icon} size={11} color={meta.color} />
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={[styles.dateText, { color: C.textTertiary }]}>{formatDate(r.date)}</Text>
          </View>
          {r.results && (
            <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={3}>{r.results}</Text>
          )}
          {(r.place || r.cost != null) && (
            <View style={styles.cardMeta}>
              {r.place && (
                <>
                  <Feather name="map-pin" size={12} color={C.textTertiary} />
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>{r.place}</Text>
                </>
              )}
              {r.cost != null && (
                <>
                  {r.place && <View style={styles.metaDot} />}
                  <Text style={[styles.metaText, { color: C.textSecondary }]}>${r.cost.toFixed(2)}</Text>
                </>
              )}
            </View>
          )}
          {r.nextInspectionDate && (
            <View style={styles.cardMeta}>
              <Feather name="calendar" size={12} color={C.textTertiary} />
              <Text style={[styles.metaText, { color: C.textSecondary }]}>Next: {formatDate(r.nextInspectionDate)}</Text>
            </View>
          )}
          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => confirmDelete(`/cars/${carId}/inspections/${r.id}`, "inspections")}
              style={[styles.actionBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}
            >
              <Feather name="trash-2" size={14} color={meta.color} />
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
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
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          {(() => {
            let firstPhoto: string | null = null;
            try { firstPhoto = car.photos ? JSON.parse(car.photos)[0] ?? null : null; } catch {}
            return firstPhoto ? (
              <Image source={{ uri: firstPhoto }} style={styles.iconBox} />
            ) : (
              <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="car-outline" size={26} color="#1A56DB" />
              </View>
            );
          })()}
          <View style={styles.headerText}>
            <Text style={[styles.carName, { color: C.text }]} numberOfLines={1}>
              {car.nickname ?? `${car.year} ${car.make} ${car.model}`}
            </Text>
            <Text style={[styles.plate, { color: C.textSecondary }]} numberOfLines={1}>
              {car.nickname ? `${car.year} ${car.make} ${car.model}` : car.licensePlate ?? ""}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/car/edit", params: { id: String(carId) } }); }}
              hitSlop={8}
              style={[styles.headerBtn, { backgroundColor: C.backgroundTertiary }]}
            >
              <Feather name="edit-2" size={16} color={C.text} />
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/report/[id]", params: { id: String(carId) } }); }}
              hitSlop={8}
              style={[styles.headerBtn, { backgroundColor: C.infoLight }]}
            >
              <Feather name="file-text" size={16} color={C.info} />
            </Pressable>
          </View>
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentPadding, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 24 }} />
        ) : events.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No events yet"
            description="Faults, maintenance, and inspections will appear here."
            actionLabel="Log Event"
            onAction={() => router.push({ pathname: "/event/add", params: { carId: String(carId) } })}
            btnColor="#DC2626"
          />
        ) : (
          events.map(renderEvent)
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  headerText: { flex: 1 },
  backBtn: {},
  carName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  plate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
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
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  content: { flex: 1 },
  contentPadding: { padding: 16, gap: 0 },

  card: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
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
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1", marginHorizontal: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center" },
  cardActions: { flexDirection: "row", gap: 8 },
  warningMsgText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  warningMsgLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  iconsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", alignSelf: "flex-start", backgroundColor: "#4B5563", borderRadius: 10, padding: 10 },
  actionBtn: {
    width: 30, height: 30,
    alignItems: "center", justifyContent: "center",
    borderRadius: 8, borderWidth: 1,
  },
});
