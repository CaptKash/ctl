import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";

type CarStub = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type FaultRecord = {
  id: number;
  carId: number;
  description: string;
  date: string;
  phase?: string | null;
  completed: boolean;
  car: CarStub | null;
};

type MaintenanceRecord = {
  id: number;
  carId: number;
  description: string;
  date: string;
  type: string;
  shop?: string | null;
  cost?: number | null;
  car: CarStub | null;
};

type InspectionRecord = {
  id: number;
  carId: number;
  date: string;
  place?: string | null;
  results?: string | null;
  cost?: number | null;
  car: CarStub | null;
};

type HistoryItem = {
  key: string;
  carId: number;
  type: "malfunction" | "maintenance" | "inspection";
  date: string;
  title: string;
  subtitle: string;
  carName: string;
  completed: boolean;
};

function carLabel(car: CarStub | null): string {
  if (!car) return "Unknown car";
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}

function buildHtml(items: HistoryItem[], filterLabel: string): string {
  const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const rows = items.map((ev) => {
    const type = ev.type === "malfunction" ? "Fault" : ev.type === "inspection" ? "Inspection" : "Repair";
    const status = ev.type === "malfunction" ? (ev.completed ? "Resolved" : "Active") : "—";
    return `<tr>
      <td>${formatDate(ev.date)}</td>
      <td><span class="badge ${ev.type}">${type}</span></td>
      <td>${ev.title}</td>
      <td>${ev.subtitle || "—"}</td>
      <td>${ev.carName}</td>
      <td>${status}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <title>CTL History Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; padding: 40px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; background: #f3f4f6; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .malfunction { background: #FEE2E2; color: #DC2626; }
    .maintenance  { background: #FEF3C7; color: #D97706; }
    .inspection   { background: #CCFBF1; color: #0D9488; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <h1>CTL History Report</h1>
  <div class="meta">Generated ${now} &nbsp;·&nbsp; ${filterLabel} &nbsp;·&nbsp; ${items.length} record${items.length !== 1 ? "s" : ""}</div>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Details</th><th>Car</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </body></html>`;
}

async function openReport(items: HistoryItem[], filterLabel: string) {
  const html = buildHtml(items, filterLabel);

  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ctl-history-report.html";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    }
  } else {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "CTL History Report" });
      } else {
        await Print.printAsync({ html });
      }
    } catch {
      await Print.printAsync({ html });
    }
  }
}

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId: carIdParam } = useLocalSearchParams<{ carId?: string }>();

  const parsedCarIdParam = carIdParam ? parseInt(carIdParam) : null;
  const [selectedCarIds, setSelectedCarIds] = useState<number[]>(
    parsedCarIdParam && !isNaN(parsedCarIdParam) ? [parsedCarIdParam] : []
  );
  const [includeFaults, setIncludeFaults] = useState(true);
  const [includeRepairs, setIncludeRepairs] = useState(true);
  const [includeInspections, setIncludeInspections] = useState(true);

  const carsQuery = useQuery<CarStub[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<CarStub[]>("/cars"),
  });

  const faultsQuery = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const repairsQuery = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance-all"],
    queryFn: () => apiGet<MaintenanceRecord[]>("/maintenance"),
  });

  const inspectionsQuery = useQuery<InspectionRecord[]>({
    queryKey: ["inspections-all"],
    queryFn: () => apiGet<InspectionRecord[]>("/inspections"),
  });

  const isLoading = carsQuery.isLoading || faultsQuery.isLoading || repairsQuery.isLoading || inspectionsQuery.isLoading;

  const cars: CarStub[] = carsQuery.data ?? [];

  const allItems: HistoryItem[] = React.useMemo(() => {
    const faults = (faultsQuery.data ?? []).map((r): HistoryItem => ({
      key: `malfunction-${r.id}`,
      carId: r.carId,
      type: "malfunction",
      date: r.date,
      title: r.description,
      subtitle: (r.phase ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      carName: carLabel(r.car),
      completed: r.completed,
    }));

    const repairs = (repairsQuery.data ?? []).map((r): HistoryItem => ({
      key: `maintenance-${r.id}`,
      carId: r.carId,
      type: "maintenance",
      date: r.date,
      title: r.description,
      subtitle: [r.type, r.shop].filter(Boolean).join(" · "),
      carName: carLabel(r.car),
      completed: false,
    }));

    const inspections = (inspectionsQuery.data ?? []).map((r): HistoryItem => ({
      key: `inspection-${r.id}`,
      carId: r.carId,
      type: "inspection",
      date: r.date,
      title: r.results ? `Inspection — ${r.results}` : "Inspection",
      subtitle: r.place ?? "",
      carName: carLabel(r.car),
      completed: false,
    }));

    return [...faults, ...repairs, ...inspections].sort((a, b) => b.date.localeCompare(a.date));
  }, [faultsQuery.data, repairsQuery.data, inspectionsQuery.data]);

  const allSelected = selectedCarIds.length === 0;

  function toggleCar(id: number) {
    Haptics.selectionAsync();
    setSelectedCarIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    Haptics.selectionAsync();
    setSelectedCarIds([]);
  }

  const filteredItems = allItems.filter((ev) => {
    if (!allSelected && !selectedCarIds.includes(ev.carId)) return false;
    if (!includeFaults && ev.type === "malfunction") return false;
    if (!includeRepairs && ev.type === "maintenance") return false;
    if (!includeInspections && ev.type === "inspection") return false;
    return true;
  });

  const canGenerate = (includeFaults || includeRepairs || includeInspections) && filteredItems.length > 0;

  async function handleGenerate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let carPart: string;
    if (allSelected) {
      carPart = "All Cars";
    } else if (selectedCarIds.length === 1) {
      const [id] = selectedCarIds;
      carPart = carLabel(cars.find((c) => c.id === id) ?? null);
    } else {
      carPart = `${selectedCarIds.length} Cars`;
    }
    const typePart = includeFaults && includeRepairs ? "Faults & Repairs"
      : includeFaults ? "Faults only"
      : "Repairs only";
    await openReport(filteredItems, `${carPart} · ${typePart}`);
  }

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#D1FAE5" }]}>
            <Feather name="file-text" size={22} color="#059669" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Generate Report</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {isLoading ? "Loading…" : `${filteredItems.length} record${filteredItems.length !== 1 ? "s" : ""} selected`}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

          {/* Car filter */}
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>CARS</Text>
          <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
            {/* All Cars toggle */}
            <Pressable
              onPress={selectAll}
              style={[styles.optionRow, { borderBottomColor: C.border, borderBottomWidth: cars.length > 0 ? StyleSheet.hairlineWidth : 0 }]}
            >
              <Text style={[styles.optionText, { color: C.text }]}>All Cars</Text>
              <View style={[styles.checkbox, { borderColor: allSelected ? "#059669" : C.border, backgroundColor: allSelected ? "#059669" : "transparent" }]}>
                {allSelected && <Feather name="check" size={12} color="#fff" />}
              </View>
            </Pressable>
            {cars.map((car, i) => {
              const checked = selectedCarIds.includes(car.id);
              return (
                <Pressable
                  key={car.id}
                  onPress={() => toggleCar(car.id)}
                  style={[styles.optionRow, { borderBottomColor: C.border, borderBottomWidth: i < cars.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
                >
                  <Text style={[styles.optionText, { color: C.text }]}>{carLabel(car)}</Text>
                  <View style={[styles.checkbox, { borderColor: checked ? "#059669" : C.border, backgroundColor: checked ? "#059669" : "transparent" }]}>
                    {checked && <Feather name="check" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Record types */}
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>RECORD TYPES</Text>
          <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setIncludeFaults((v) => !v); }}
              style={[styles.optionRow, { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.typeDot, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="alert-triangle" size={12} color="#DC2626" />
                </View>
                <Text style={[styles.optionText, { color: C.text }]}>Faults</Text>
              </View>
              <View style={[styles.checkbox, { borderColor: includeFaults ? "#059669" : C.border, backgroundColor: includeFaults ? "#059669" : "transparent" }]}>
                {includeFaults && <Feather name="check" size={12} color="#fff" />}
              </View>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setIncludeRepairs((v) => !v); }}
              style={[styles.optionRow, { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.typeDot, { backgroundColor: "#FEF3C7" }]}>
                  <Feather name="tool" size={12} color="#D97706" />
                </View>
                <Text style={[styles.optionText, { color: C.text }]}>Repairs</Text>
              </View>
              <View style={[styles.checkbox, { borderColor: includeRepairs ? "#059669" : C.border, backgroundColor: includeRepairs ? "#059669" : "transparent" }]}>
                {includeRepairs && <Feather name="check" size={12} color="#fff" />}
              </View>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setIncludeInspections((v) => !v); }}
              style={styles.optionRow}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.typeDot, { backgroundColor: "#CCFBF1" }]}>
                  <Feather name="clipboard" size={12} color="#0D9488" />
                </View>
                <Text style={[styles.optionText, { color: C.text }]}>Inspections</Text>
              </View>
              <View style={[styles.checkbox, { borderColor: includeInspections ? "#059669" : C.border, backgroundColor: includeInspections ? "#059669" : "transparent" }]}>
                {includeInspections && <Feather name="check" size={12} color="#fff" />}
              </View>
            </Pressable>
          </View>

          {/* Summary */}
          <View style={[styles.summary, { backgroundColor: "#D1FAE5", borderColor: "#6EE7B7" }]}>
            <Feather name="info" size={15} color="#059669" />
            <Text style={styles.summaryText}>
              {canGenerate
                ? `${filteredItems.length} record${filteredItems.length !== 1 ? "s" : ""} will be included in the report.`
                : filteredItems.length === 0
                  ? "No records match the current filters."
                  : "Select at least one record type."}
            </Text>
          </View>

          {/* Generate button */}
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate}
            style={({ pressed }) => [
              styles.generateBtn,
              { opacity: !canGenerate ? 0.45 : pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="file-text" size={17} color="#fff" />
            <Text style={styles.generateBtnText}>Generate &amp; Open Report</Text>
          </Pressable>
        </ScrollView>
      )}

      <BottomNav active="history" />
    </SwipeBackView>
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
  backBtn: { marginRight: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

  scroll: { flex: 1 },
  content: { padding: 20, gap: 8 },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  typeDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#065F46" },

  generateBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 16,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
