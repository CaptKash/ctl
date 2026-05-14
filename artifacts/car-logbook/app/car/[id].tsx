import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { formatDate } from "@/lib/dateUtils";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { BrandLogo } from "@/components/BrandLogo";
import { apiGet, apiDelete } from "@/hooks/useApi";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
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
  shopAddress?: string | null;
  shopPhone?: string | null;
  correctiveAction?: string | null;
  partsReplaced?: string | null;
  warrantyPeriod?: string | null;
  warrantyDetails?: string | null;
  billPhoto?: string | null;
  warrantyPhoto?: string | null;
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
  const C = useColors();
  const { unit } = useDistanceUnit();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", onConfirm: () => {} });

  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [photoViewer, setPhotoViewer] = useState<string | null>(null);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const handleDownloadPhoto = (url: string) => {
    if (!url || downloadingPhoto) return;
    setPhotoViewer(null);
    setTimeout(() => doShare(url), 600);
  };

  const doShare = async (url: string) => {
    setDownloadingPhoto(true);
    try {
      const filename = `ctl_photo_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      if (url.startsWith("data:")) {
        const base64 = url.split(",")[1];
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: "base64",
        });
      } else {
        await FileSystem.downloadAsync(url, fileUri);
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error("Sharing not available on this device");

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
        dialogTitle: "Save Photo",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Save failed", msg);
    } finally {
      setDownloadingPhoto(false);
    }
  };

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
        <Pressable
          key={key}
          onPress={() => { Haptics.selectionAsync(); setDetailEvent(ev); }}
          style={({ pressed }) => [styles.card, { backgroundColor: C.card, borderColor: meta.color, opacity: pressed ? 0.9 : 1 }]}
        >
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
            <View style={styles.photoBadges}>
              {r.billPhoto && (
                <View style={[styles.photoBadge, { backgroundColor: meta.bg }]}>
                  <Feather name="image" size={11} color={meta.color} />
                  <Text style={[styles.photoBadgeText, { color: meta.color }]}>Bill</Text>
                </View>
              )}
              {r.warrantyPhoto && (
                <View style={[styles.photoBadge, { backgroundColor: "#EDE9FE" }]}>
                  <Feather name="shield" size={11} color="#7C3AED" />
                  <Text style={[styles.photoBadgeText, { color: "#7C3AED" }]}>Warranty</Text>
                </View>
              )}
              {!r.billPhoto && !r.warrantyPhoto && <View style={{ flex: 1 }} />}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => confirmDelete(`/cars/${carId}/maintenance/${r.id}`, "maintenance")}
                style={[styles.actionBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}
              >
                <Feather name="trash-2" size={14} color={meta.color} />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      );
    }

    if (ev.kind === "inspection") {
      const r = ev.data;
      return (
        <Pressable
          key={key}
          onPress={() => { Haptics.selectionAsync(); setDetailEvent(ev); }}
          style={({ pressed }) => [styles.card, { backgroundColor: C.card, borderColor: meta.color, opacity: pressed ? 0.9 : 1 }]}
        >
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
            <TouchableOpacity
              onPress={() => confirmDelete(`/cars/${carId}/inspections/${r.id}`, "inspections")}
              style={[styles.actionBtn, { backgroundColor: meta.bg, borderColor: meta.color }]}
            >
              <Feather name="trash-2" size={14} color={meta.color} />
            </TouchableOpacity>
          </View>
        </Pressable>
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
    <SwipeBackView style={{ backgroundColor: C.background }}>
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
              <BrandLogo
                make={car.make}
                size={48}
                style={styles.iconBox}
                fallbackBg="#DBEAFE"
                fallbackIconColor="#1A56DB"
              />
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
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/report", params: { carId: String(carId) } }); }}
              hitSlop={8}
              style={[styles.headerBtn, { backgroundColor: C.infoLight }]}
            >
              <Feather name="file-text" size={16} color={C.info} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Stats Strip — 2-row compact layout */}
      {(() => {
        const expiryColor = (iso: string | null | undefined): string => {
          if (!iso) return C.text;
          const days = Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
          if (days <= 0) return "#DC2626";
          if (days <= 60) return "#D97706";
          return "#16A34A";
        };
        const hasExpiry = !!(car.licenseValidUntil || car.insuredUntil);
        return (
          <View style={[styles.statsStrip, { backgroundColor: C.card }]}>
            {/* Row 1: Car info pills */}
            <View style={styles.statsRow}>
              {car.mileage != null && (
                <View style={[styles.infoPill, { marginRight: 16 }]}>
                  <Text style={[styles.pillLabel, { color: C.textSecondary }]}>{unit} </Text>
                  <Text style={[styles.pillValue, { color: C.text }]} numberOfLines={1}>{car.mileage.toLocaleString()}</Text>
                </View>
              )}
              {car.licensePlate && (
                <View style={[styles.infoPill, { marginRight: 16 }]}>
                  <Text style={[styles.pillLabel, { color: C.textSecondary }]}>Plate </Text>
                  <Text style={[styles.pillValue, { color: C.text }]} numberOfLines={1}>{car.licensePlate}</Text>
                </View>
              )}
              {car.color && (
                <View style={[styles.infoPill, { marginRight: 16 }]}>
                  <Text style={[styles.pillLabel, { color: C.textSecondary }]}>Color </Text>
                  <Text style={[styles.pillValue, { color: C.text }]} numberOfLines={1}>{car.color}</Text>
                </View>
              )}
              {car.vin && (
                <View style={styles.infoPill}>
                  <Text style={[styles.pillLabel, { color: C.textSecondary }]}>VIN </Text>
                  <Text style={[styles.pillValue, { color: C.text }]} numberOfLines={1}>{car.vin.slice(-6)}</Text>
                </View>
              )}
            </View>
            {/* Row 2: Expiry date pills */}
            {hasExpiry && (
              <View style={[styles.statsRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}>
                {car.licenseValidUntil && (
                  <View style={[styles.expiryPill, { marginRight: 20 }]}>
                    <View style={[styles.expiryDot, { backgroundColor: expiryColor(car.licenseValidUntil) }]} />
                    <Text style={[styles.pillLabel, { color: C.textSecondary, marginLeft: 5 }]}>Lic. </Text>
                    <Text style={[styles.expiryValue, { color: expiryColor(car.licenseValidUntil) }]} numberOfLines={1}>{formatDate(car.licenseValidUntil)}</Text>
                  </View>
                )}
                {car.insuredUntil && (
                  <View style={styles.expiryPill}>
                    <View style={[styles.expiryDot, { backgroundColor: expiryColor(car.insuredUntil) }]} />
                    <Text style={[styles.pillLabel, { color: C.textSecondary, marginLeft: 5 }]}>Ins. </Text>
                    <Text style={[styles.expiryValue, { color: expiryColor(car.insuredUntil) }]} numberOfLines={1}>{formatDate(car.insuredUntil)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })()}

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
            actionLabel="Technical Log"
            onAction={() => router.push({ pathname: "/event/add", params: { carId: String(carId) } })}
            btnColor="#FEE2E2"
            btnTextColor="#DC2626"
            btnIcon="plus-circle"
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

      {/* Event Detail Sheet */}
      <Modal
        visible={!!detailEvent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailEvent(null)}
      >
        {detailEvent && (() => {
          const meta = EVENT_META[detailEvent.kind];
          if (detailEvent.kind === "maintenance") {
            const r = detailEvent.data;
            const rows: { label: string; value: string }[] = [];
            if (r.correctiveAction && r.correctiveAction !== r.description) rows.push({ label: "Corrective Action", value: r.correctiveAction });
            if (r.shop) rows.push({ label: "Shop", value: r.shop });
            if (r.shopAddress) rows.push({ label: "Address", value: r.shopAddress });
            if (r.shopPhone) rows.push({ label: "Phone", value: r.shopPhone });
            if (r.cost != null) rows.push({ label: "Cost", value: `$${r.cost.toFixed(2)}` });
            if (r.partsReplaced) rows.push({ label: "Parts Replaced", value: r.partsReplaced });
            if (r.warrantyPeriod) rows.push({ label: "Warranty Period", value: r.warrantyPeriod });
            if (r.warrantyDetails) rows.push({ label: "Warranty Details", value: r.warrantyDetails });
            return (
              <View style={[detailStyles.sheet, { backgroundColor: C.backgroundSecondary }]}>
                <View style={[detailStyles.sheetHeader, { borderBottomColor: C.border, backgroundColor: C.card }]}>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Feather name={meta.icon} size={12} color={meta.color} />
                    <Text style={[styles.badgeText, { color: meta.color }]}>{r.type || meta.label}</Text>
                  </View>
                  <Text style={[detailStyles.dateLabel, { color: C.textSecondary }]}>{formatDate(r.date)}</Text>
                  <Pressable onPress={() => setDetailEvent(null)} hitSlop={12}>
                    <Feather name="x" size={22} color={C.textSecondary} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={detailStyles.body} showsVerticalScrollIndicator={false}>
                  <Text style={[detailStyles.title, { color: C.text }]}>{r.description}</Text>
                  {rows.map((row) => (
                    <View key={row.label} style={[detailStyles.row, { borderBottomColor: C.borderLight }]}>
                      <Text style={[detailStyles.rowLabel, { color: C.textSecondary }]}>{row.label}</Text>
                      <Text style={[detailStyles.rowValue, { color: C.text }]}>{row.value}</Text>
                    </View>
                  ))}
                  {r.billPhoto && (
                    <View style={detailStyles.photoSection}>
                      <Text style={[detailStyles.photoLabel, { color: C.textSecondary }]}>Bill Photo</Text>
                      <Pressable onPress={() => setPhotoViewer(r.billPhoto!)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                        <Image source={{ uri: r.billPhoto }} style={detailStyles.photoThumb} resizeMode="cover" />
                        <View style={[detailStyles.photoHint, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                          <Feather name="maximize-2" size={14} color="#fff" />
                          <Text style={detailStyles.photoHintText}>Tap to enlarge</Text>
                        </View>
                      </Pressable>
                    </View>
                  )}
                  {r.warrantyPhoto && (
                    <View style={detailStyles.photoSection}>
                      <Text style={[detailStyles.photoLabel, { color: C.textSecondary }]}>Warranty Photo</Text>
                      <Pressable onPress={() => setPhotoViewer(r.warrantyPhoto!)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                        <Image source={{ uri: r.warrantyPhoto }} style={detailStyles.photoThumb} resizeMode="cover" />
                        <View style={[detailStyles.photoHint, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                          <Feather name="maximize-2" size={14} color="#fff" />
                          <Text style={detailStyles.photoHintText}>Tap to enlarge</Text>
                        </View>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              </View>
            );
          }
          if (detailEvent.kind === "inspection") {
            const r = detailEvent.data;
            const rows: { label: string; value: string }[] = [];
            if (r.place) rows.push({ label: "Location", value: r.place });
            if (r.cost != null) rows.push({ label: "Cost", value: `$${r.cost.toFixed(2)}` });
            if (r.requiredRepairs) rows.push({ label: "Required Repairs", value: r.requiredRepairs });
            if (r.nextInspectionDate) rows.push({ label: "Next Inspection", value: formatDate(r.nextInspectionDate) });
            return (
              <View style={[detailStyles.sheet, { backgroundColor: C.backgroundSecondary }]}>
                <View style={[detailStyles.sheetHeader, { borderBottomColor: C.border, backgroundColor: C.card }]}>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Feather name={meta.icon} size={12} color={meta.color} />
                    <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[detailStyles.dateLabel, { color: C.textSecondary }]}>{formatDate(r.date)}</Text>
                  <Pressable onPress={() => setDetailEvent(null)} hitSlop={12}>
                    <Feather name="x" size={22} color={C.textSecondary} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={detailStyles.body} showsVerticalScrollIndicator={false}>
                  {r.results && <Text style={[detailStyles.title, { color: C.text }]}>{r.results}</Text>}
                  {rows.map((row) => (
                    <View key={row.label} style={[detailStyles.row, { borderBottomColor: C.borderLight }]}>
                      <Text style={[detailStyles.rowLabel, { color: C.textSecondary }]}>{row.label}</Text>
                      <Text style={[detailStyles.rowValue, { color: C.text }]}>{row.value}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          }
          return null;
        })()}

        {/* Full-screen photo viewer — nested here to work on top of pageSheet on iOS */}
        <Modal
          visible={!!photoViewer}
          animationType="fade"
          onRequestClose={() => setPhotoViewer(null)}
          statusBarTranslucent
        >
          <View style={detailStyles.photoModal}>
            <Pressable onPress={() => setPhotoViewer(null)} style={detailStyles.photoModalClose} hitSlop={12}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
            {photoViewer && (
              <Image source={{ uri: photoViewer }} style={detailStyles.photoFull} resizeMode="contain" />
            )}
            <Pressable
              onPress={() => photoViewer && handleDownloadPhoto(photoViewer)}
              disabled={downloadingPhoto}
              style={detailStyles.photoModalDownload}
              hitSlop={12}
            >
              {downloadingPhoto ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <>
                  <Feather name="download" size={20} color="#fff" />
                  <Text style={detailStyles.photoModalDownloadText}>Save</Text>
                </>
              )}
            </Pressable>
          </View>
        </Modal>
      </Modal>

      <BottomNav />
    </SwipeBackView>
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
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
    overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.04)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  pillValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  expiryPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  expiryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  expiryValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
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
  photoBadges: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  photoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  photoBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

const detailStyles = StyleSheet.create({
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  body: { padding: 20, gap: 0, paddingBottom: 48 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 24, marginBottom: 16 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 13, fontFamily: "Inter_500Medium", width: 130 },
  rowValue: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  photoSection: { marginTop: 24, gap: 10 },
  photoLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  photoThumb: { width: "100%", height: 220, borderRadius: 12 },
  photoHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoHintText: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium" },
  photoModal: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  photoModalClose: {
    position: "absolute",
    top: 56,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoFull: { width: "100%", height: "80%" },
  photoModalDownload: {
    position: "absolute",
    bottom: 56,
    right: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  photoModalDownloadText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
