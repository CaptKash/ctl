import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/context/ThemeContext";
import { apiGet } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
};

const SECTIONS = [
  { id: "maintenance", label: "Maintenance Logs", icon: "tool" as const },
  { id: "fuel", label: "Fuel Records", icon: "droplet" as const },
  { id: "parts", label: "Parts Replaced", icon: "package" as const },
  { id: "insurance", label: "Insurance", icon: "shield" as const },
  { id: "faults", label: "Faults / Malfunctions", icon: "alert-triangle" as const },
  { id: "inspections", label: "Inspections", icon: "clipboard" as const },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const HIDDEN_FIELDS = new Set(["id", "carId", "userId", "createdAt", "updatedAt", "completed"]);

function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatVal(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]).filter((k) => !HIDDEN_FIELDS.has(k));
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.map((h) => escape(toLabel(h))).join(","),
    ...rows.map((r) => headers.map((h) => escape(formatVal(r[h]))).join(",")),
  ];
  return lines.join("\n");
}

function carLabel(car: Car) {
  return `${car.year} ${car.make} ${car.model}${car.nickname ? ` (${car.nickname})` : ""}`;
}

function buildPdfHtml(car: Car, sections: Record<SectionId, unknown[]>): string {
  const label = carLabel(car);
  const plate = car.licensePlate ? `License: ${car.licensePlate}` : "";
  const odo = car.mileage ? `Mileage: ${car.mileage.toLocaleString()} km` : "";
  const generated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const tableHtml = (rows: Record<string, unknown>[]): string => {
    if (!rows.length) return "<p class='empty'>No records found.</p>";
    const headers = Object.keys(rows[0]).filter((k) => !HIDDEN_FIELDS.has(k));
    return `<table>
      <thead><tr>${headers.map((h) => `<th>${toLabel(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map((r) => `<tr>${headers.map((h) => `<td>${formatVal(r[h])}</td>`).join("")}</tr>`)
        .join("")}</tbody>
    </table>`;
  };

  const sectionOrder: SectionId[] = ["maintenance", "fuel", "parts", "insurance", "faults", "inspections"];
  const sectionLabels: Record<SectionId, string> = {
    maintenance: "Maintenance Logs",
    fuel: "Fuel Records",
    parts: "Parts Replaced",
    insurance: "Insurance",
    faults: "Faults / Malfunctions",
    inspections: "Inspections",
  };

  const sectionsHtml = sectionOrder
    .filter((id) => sections[id] !== undefined)
    .map(
      (id) => `
      <div class="section">
        <h2>${sectionLabels[id]}</h2>
        ${tableHtml(sections[id] as Record<string, unknown>[])}
      </div>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #111; padding: 40px; }
    .header { border-bottom: 3px solid #D97706; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; margin: 0 0 6px; color: #111; }
    .header .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .meta { color: #555; font-size: 12px; margin-top: 6px; }
    .section { margin-bottom: 32px; page-break-inside: avoid; }
    .section h2 { font-size: 15px; color: #D97706; border-bottom: 1px solid #FDE68A; padding-bottom: 4px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #F9FAFB; text-align: left; padding: 6px 8px; border-bottom: 2px solid #E5E7EB; color: #374151; font-weight: 700; }
    td { padding: 5px 8px; border-bottom: 1px solid #F3F4F6; color: #374151; }
    tr:nth-child(even) td { background: #FAFAFA; }
    .empty { color: #9CA3AF; font-style: italic; font-size: 11px; }
    .footer { margin-top: 40px; text-align: center; color: #9CA3AF; font-size: 10px; }
  </style></head><body>
  <div class="header">
    <div class="badge">CTL Fleet Report</div>
    <h1>${label}</h1>
    <p class="meta">${[plate, odo, `Generated: ${generated}`].filter(Boolean).join("  ·  ")}</p>
  </div>
  ${sectionsHtml}
  <div class="footer">Generated by Car Technical Log · CTL Fleet</div>
  </body></html>`;
}

function buildCombinedCsv(car: Car, sections: Record<SectionId, unknown[]>): string {
  const label = carLabel(car);
  const sectionOrder: SectionId[] = ["maintenance", "fuel", "parts", "insurance", "faults", "inspections"];
  const sectionLabels: Record<SectionId, string> = {
    maintenance: "MAINTENANCE LOGS",
    fuel: "FUEL RECORDS",
    parts: "PARTS REPLACED",
    insurance: "INSURANCE",
    faults: "FAULTS / MALFUNCTIONS",
    inspections: "INSPECTIONS",
  };

  const lines: string[] = [
    `"CTL Export: ${label}"`,
    `"Generated: ${new Date().toLocaleDateString()}"`,
    "",
  ];

  sectionOrder
    .filter((id) => sections[id] !== undefined)
    .forEach((id) => {
      lines.push(`"--- ${sectionLabels[id]} ---"`);
      const csv = toCSV(sections[id] as Record<string, unknown>[]);
      if (csv) lines.push(csv);
      else lines.push('"No records"');
      lines.push("");
    });

  return lines.join("\n");
}

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [enabled, setEnabled] = useState<Set<SectionId>>(
    new Set(["maintenance", "fuel", "parts", "insurance", "faults", "inspections"])
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: cars, isLoading: carsLoading } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const selectedCar = cars?.find((c) => c.id === selectedCarId) ?? cars?.[0] ?? null;

  function toggleSection(id: SectionId) {
    Haptics.selectionAsync();
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (!selectedCar) return;
    setGenerating(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const carId = selectedCar.id;
      const endpoints: Partial<Record<SectionId, string>> = {
        maintenance: `/cars/${carId}/maintenance`,
        fuel: `/cars/${carId}/fuel`,
        parts: `/cars/${carId}/parts`,
        insurance: `/cars/${carId}/insurance`,
        faults: `/cars/${carId}/malfunctions`,
        inspections: `/cars/${carId}/inspections`,
      };

      const fetched: Partial<Record<SectionId, unknown[]>> = {};
      await Promise.all(
        ([...enabled] as SectionId[]).map(async (id) => {
          const url = endpoints[id];
          if (!url) return;
          try {
            const data = await apiGet<unknown[]>(url);
            fetched[id] = Array.isArray(data) ? data : [];
          } catch {
            fetched[id] = [];
          }
        })
      );

      const sections = fetched as Record<SectionId, unknown[]>;

      if (format === "pdf") {
        const html = buildPdfHtml(selectedCar, sections);
        if (Platform.OS === "web") {
          await Print.printAsync({ html });
        } else {
          const { uri } = await Print.printToFileAsync({ html, base64: false });
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
          } else {
            await Print.printAsync({ html });
          }
        }
      } else {
        const csv = buildCombinedCsv(selectedCar, sections);
        const filename =
          `CTL_${selectedCar.make}_${selectedCar.model}_${selectedCar.year}_${Date.now()}.csv`.replace(/\s+/g, "_");
        if (Platform.OS === "web") {
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          const cacheDir = FileSystem.cacheDirectory;
          if (cacheDir) {
            const path = cacheDir + filename;
            await FileSystem.writeAsStringAsync(path, csv, { encoding: "utf8" as any });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(path, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
            } else {
              await Share.share({ message: csv, title: filename });
            }
          } else {
            await Share.share({ message: csv, title: filename });
          }
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Export failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Data Backup & Export</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content]} showsVerticalScrollIndicator={false}>

        {/* Car selector */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>VEHICLE</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          {carsLoading ? (
            <ActivityIndicator color={C.tint} style={{ padding: 16 }} />
          ) : !cars?.length ? (
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>No vehicles found.</Text>
          ) : (
            cars.map((car, idx) => {
              const active = (selectedCar?.id ?? cars[0]?.id) === car.id;
              return (
                <Pressable
                  key={car.id}
                  onPress={() => { setSelectedCarId(car.id); Haptics.selectionAsync(); }}
                  style={[
                    styles.optionRow,
                    idx < cars.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
                  ]}
                >
                  <View style={[styles.radio, { borderColor: active ? C.tint : C.textTertiary }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: C.tint }]} />}
                  </View>
                  <Text style={[styles.optionText, { color: C.text }]}>{carLabel(car)}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Format selector */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>FORMAT</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          {(["pdf", "csv"] as const).map((f, idx) => {
            const active = format === f;
            const labels = { pdf: "PDF Report", csv: "CSV Spreadsheet" };
            const subs = {
              pdf: "Styled report — great for printing or sharing",
              csv: "Raw data — open in Excel or Google Sheets",
            };
            return (
              <Pressable
                key={f}
                onPress={() => { setFormat(f); Haptics.selectionAsync(); }}
                style={[
                  styles.optionRow,
                  idx === 0 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
                  { paddingVertical: 14 },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? C.tint : C.textTertiary }]}>
                  {active && <View style={[styles.radioInner, { backgroundColor: C.tint }]} />}
                </View>
                <View>
                  <Text style={[styles.optionText, { color: C.text }]}>{labels[f]}</Text>
                  <Text style={[styles.optionSub, { color: C.textSecondary }]}>{subs[f]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Sections */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>INCLUDE</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          {SECTIONS.map((s, idx) => {
            const on = enabled.has(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggleSection(s.id)}
                style={[
                  styles.optionRow,
                  idx < SECTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
                ]}
              >
                <Feather name={s.icon} size={16} color={on ? C.tint : C.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.optionText, { color: on ? C.text : C.textSecondary, flex: 1 }]}>{s.label}</Text>
                <View style={[styles.toggle, { backgroundColor: on ? C.tint : C.border }]}>
                  <View style={[styles.toggleThumb, { transform: [{ translateX: on ? 18 : 2 }] }]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Generate button */}
        <Pressable
          onPress={generate}
          disabled={generating || !selectedCar || enabled.size === 0}
          style={({ pressed }) => [
            styles.generateBtn,
            { backgroundColor: C.tint, opacity: pressed || generating || !selectedCar || enabled.size === 0 ? 0.65 : 1 },
          ]}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="share" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>
                Generate {format === "pdf" ? "PDF" : "CSV"} & Share
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.note, { color: C.textTertiary }]}>
          File is generated on-device and shared via the system share sheet.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  content: { padding: 16, gap: 10, paddingBottom: 60 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 6 },

  card: { borderRadius: 14, overflow: "hidden" },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  optionText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 52,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", padding: 16, textAlign: "center" },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#DC2626", textAlign: "center" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});
