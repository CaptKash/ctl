import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
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
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import * as XLSX from "xlsx-js-style";
import { useColors } from "@/context/ThemeContext";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { isHourBased } from "@/lib/vehicleTypes";
import { apiGet } from "@/hooks/useApi";
import { useCars } from "@/hooks/useCars";
import { REPORT_LOGO } from "@/lib/reportLogo";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
  usageUnit?: string | null;
};

const SECTIONS = [
  { id: "maintenance", icon: "tool" as const },
  { id: "fuel", icon: "droplet" as const },
  { id: "parts", icon: "package" as const },
  { id: "insurance", icon: "shield" as const },
  { id: "faults", icon: "alert-triangle" as const },
  { id: "inspections", icon: "clipboard" as const },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const SECTION_ORDER: SectionId[] = ["maintenance", "fuel", "parts", "insurance", "faults", "inspections"];

const SECTION_COLORS: Record<SectionId, string> = {
  maintenance: "#D97706",
  fuel: "#1D4ED8",
  parts: "#7C3AED",
  insurance: "#0D9488",
  faults: "#DC2626",
  inspections: "#059669",
};

const HIDDEN_FIELDS = new Set([
  "id",
  "carId",
  "userId",
  "createdAt",
  "updatedAt",
  "completed",
  "billPhoto",
  "warrantyPhoto",
]);

function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function fieldLabel(key: string, t: TFunction): string {
  return t(`export.fields.${key}`, { defaultValue: toLabel(key) });
}

function sectionName(id: SectionId, t: TFunction): string {
  return t(`export.sections.${id}`);
}

function safeSheetName(raw: string): string {
  let s = raw.replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > 31) s = s.slice(0, 31).trim();
  return s || "Sheet";
}

function sheetName(id: SectionId | "summary", t: TFunction): string {
  return safeSheetName(t(`export.sheets.${id}`));
}

function formatVal(v: unknown, t: TFunction): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? t("export.doc.yes") : t("export.doc.no");
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function carLabel(car: Car) {
  return `${car.year} ${car.make} ${car.model}${car.nickname ? ` (${car.nickname})` : ""}`;
}

const TITLE_STYLE = {
  font: { bold: true, color: { rgb: "0F2D5E" }, sz: 14 },
};

function headerStyle() {
  return {
    fill: { patternType: "solid", fgColor: { rgb: "0F2D5E" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function styleRow(ws: XLSX.WorkSheet, rowIdx: number, numCols: number, style: object) {
  for (let c = 0; c < numCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
    if (ws[addr]) ws[addr].s = style;
  }
}

function localeDate(isRTL: boolean): string {
  return new Date().toLocaleDateString(isRTL ? "ar" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildWorkbook(
  car: Car,
  sections: Record<SectionId, unknown[]>,
  t: TFunction,
  isRTL: boolean,
  unit: string
) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();
  const uniqueName = (raw: string) => {
    let name = raw;
    let i = 2;
    while (usedNames.has(name.toLowerCase())) {
      const suffix = ` ${i++}`;
      name = raw.slice(0, 31 - suffix.length).trim() + suffix;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };
  (wb as any).Props = {
    Title: `${t("export.doc.title")} – ${carLabel(car)}`,
    Author: t("common.appName", { defaultValue: "Car Technical Log" }),
    CreatedDate: new Date(),
  };

  const summaryRows = [
    [t("export.doc.title")],
    [carLabel(car)],
    [car.licensePlate ? `${t("export.doc.plate")}: ${car.licensePlate}` : ""],
    [car.mileage ? `${t("export.fields.mileage")}: ${car.mileage.toLocaleString()} ${unit}` : ""],
    [t("export.doc.generated", { date: localeDate(isRTL) })],
    [],
    [t("export.doc.section"), t("export.doc.records")],
    ...SECTION_ORDER.filter((id) => sections[id] !== undefined).map((id) => [
      sectionName(id, t),
      sections[id].length,
    ]),
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 30 }, { wch: 12 }];
  summaryWs["!rows"] = [{ hpt: 22 }, { hpt: 18 }];
  styleRow(summaryWs, 0, 1, TITLE_STYLE);
  styleRow(summaryWs, 6, 2, headerStyle());
  XLSX.utils.book_append_sheet(wb, summaryWs, sheetName("summary", t));

  SECTION_ORDER.filter((id) => sections[id] !== undefined).forEach((id) => {
    const rows = sections[id] as Record<string, unknown>[];

    if (!rows.length) {
      const ws = XLSX.utils.aoa_to_sheet([[t("export.doc.noRecordsSection")]]);
      ws["!cols"] = [{ wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws, uniqueName(sheetName(id, t)));
      return;
    }

    const keys = Object.keys(rows[0]).filter((k) => !HIDDEN_FIELDS.has(k));
    const header = keys.map((k) => fieldLabel(k, t));
    const dataRows = rows.map((r) => keys.map((k) => formatVal(r[k], t)));
    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

    const colWidths = keys.map((k, i) => {
      const maxData = Math.max(...dataRows.map((r) => (r[i] ?? "").length));
      return { wch: Math.max(header[i].length, maxData, 10) + 2 };
    });
    ws["!cols"] = colWidths;
    ws["!rows"] = [{ hpt: 20 }];
    styleRow(ws, 0, header.length, headerStyle());

    XLSX.utils.book_append_sheet(wb, ws, uniqueName(sheetName(id, t)));
  });

  return wb;
}

function buildPdfHtml(
  car: Car,
  sections: Record<SectionId, unknown[]>,
  t: TFunction,
  isRTL: boolean,
  unit: string
): string {
  const dir = isRTL ? "rtl" : "ltr";
  const lang = isRTL ? "ar" : "en";
  const generated = localeDate(isRTL);

  const meta = [
    car.licensePlate ? `${t("export.doc.plate")}: ${escapeHtml(car.licensePlate)}` : "",
    car.mileage ? `${t("export.fields.mileage")}: ${car.mileage.toLocaleString()} ${escapeHtml(unit)}` : "",
    t("export.doc.generated", { date: generated }),
  ].filter(Boolean);

  const included = SECTION_ORDER.filter((id) => sections[id] !== undefined);

  const chips = included
    .map((id) => {
      const n = (sections[id] as unknown[]).length;
      return `<div class="stat" style="border-top-color:${SECTION_COLORS[id]}">
        <span class="stat-num">${n}</span>
        <span class="stat-label">${escapeHtml(sectionName(id, t))}</span>
      </div>`;
    })
    .join("");

  const sectionsHtml = included
    .map((id) => {
      const rows = sections[id] as Record<string, unknown>[];
      const color = SECTION_COLORS[id];
      const name = escapeHtml(sectionName(id, t));
      const count = rows.length;

      const head = `<div class="sec-head" style="border-inline-start-color:${color}">
        <span class="sec-name">${name}</span>
        <span class="sec-count">${count}</span>
      </div>`;

      if (!rows.length) {
        return `<section class="card">${head}
          <div class="empty">${escapeHtml(t("export.doc.noRecords"))}</div>
        </section>`;
      }

      const records = rows
        .map((r, idx) => {
          const kvs = Object.keys(r)
            .filter((k) => !HIDDEN_FIELDS.has(k))
            .map((k) => {
              const val = formatVal(r[k], t);
              if (val === "") return "";
              return `<div class="kv">
                <span class="k">${escapeHtml(fieldLabel(k, t))}</span>
                <span class="v">${escapeHtml(val)}</span>
              </div>`;
            })
            .join("");

          return `<div class="record">
            <div class="record-no" style="color:${color}">${escapeHtml(
              t("export.doc.record", { num: idx + 1 })
            )}</div>
            ${kvs || `<div class="kv"><span class="v">${escapeHtml(t("export.doc.noRecords"))}</span></div>`}
          </div>`;
        })
        .join("");

      return `<section class="card">${head}<div class="records">${records}</div></section>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(t("export.doc.title"))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      direction: ${dir};
      padding: 32px 20px;
      -webkit-font-smoothing: antialiased;
      line-height: 1.45;
    }
    @page { size: A4; margin: 14mm; }
    .report { max-width: 820px; margin: 0 auto; }

    .report-header {
      background: linear-gradient(135deg, #0F2D5E 0%, #0A1A3A 100%);
      color: #fff;
      border-radius: 18px;
      padding: 26px 28px 22px;
      margin-bottom: 20px;
      box-shadow: 0 6px 18px rgba(15,45,94,0.28);
    }
    .brand { display: flex; margin-bottom: 16px; }
    .brand-mark { width: 60px; height: 60px; object-fit: contain; display: block; }
    .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; opacity: 0.8; margin-bottom: 6px; }
    .report-header h1 { font-size: 25px; font-weight: 800; margin-bottom: 9px; letter-spacing: -0.3px; }
    .meta-row { font-size: 13px; opacity: 0.92; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .meta-row .dot { opacity: 0.45; }

    .summary-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 26px; }
    .stat {
      flex: 1; min-width: 110px;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 14px; padding: 14px 16px;
      border-top: 3px solid #e2e8f0;
    }
    .stat-num { display: block; font-size: 26px; font-weight: 800; line-height: 1.1; }
    .stat-label { font-size: 12px; color: #64748b; font-weight: 600; }

    .card {
      margin-bottom: 22px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 13px;
      overflow: hidden;
    }
    .sec-head {
      display: flex; align-items: center; gap: 10px;
      padding: 13px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      border-inline-start: 4px solid #1D4ED8;
    }
    .sec-name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
    .sec-count { font-size: 12px; font-weight: 700; color: #1D4ED8; background: #DBEAFE; border-radius: 999px; padding: 3px 11px; white-space: nowrap; }

    .record {
      padding: 12px 16px;
      border-bottom: 1px solid #eef2f6;
    }
    .record:last-child { border-bottom: none; }
    .record-no {
      font-size: 10px; font-weight: 800; letter-spacing: 0.4px;
      text-transform: uppercase; color: #1D4ED8; margin-bottom: 7px;
    }
    .kv {
      display: flex; gap: 14px; align-items: baseline;
      padding: 4px 0;
      border-top: 1px dashed #f1f5f9;
    }
    .kv:first-of-type { border-top: none; }
    .kv .k {
      flex: 0 0 38%; max-width: 38%;
      font-size: 11.5px; font-weight: 600; color: #64748b;
      text-align: start;
    }
    .kv .v {
      flex: 1;
      font-size: 11.5px; color: #0f172a; font-weight: 500;
      text-align: start;
      overflow-wrap: break-word; word-break: normal;
      white-space: pre-wrap;
    }
    .empty { padding: 14px 16px; color: #94a3b8; font-style: italic; font-size: 12px; text-align: start; }

    .footer { margin-top: 28px; text-align: center; color: #94a3b8; font-size: 11px; }

    @media print {
      body { padding: 0; background: #fff; }
      .report { max-width: none; }
      .report-header, .stat, .card, .sec-head {
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .report-header { box-shadow: none; }
      .record, .stat { break-inside: avoid; }
    }
  </style></head><body>
  <div class="report">
    <header class="report-header">
      <div class="brand">
        <img class="brand-mark" src="${REPORT_LOGO}" alt="${escapeHtml(t("export.doc.title"))}"/>
      </div>
      <div class="eyebrow">${escapeHtml(t("export.doc.title"))}</div>
      <h1>${escapeHtml(carLabel(car))}</h1>
      <div class="meta-row">
        ${meta.map((m, i) => `${i > 0 ? '<span class="dot">·</span>' : ""}<span>${m}</span>`).join("")}
      </div>
    </header>
    ${chips ? `<div class="summary-bar">${chips}</div>` : ""}
    ${sectionsHtml}
    <div class="footer">${escapeHtml(t("export.doc.footer"))}</div>
  </div>
  </body></html>`;
}

async function sharePdf(html: string) {
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
}

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const { unit } = useDistanceUnit();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [format, setFormat] = useState<"pdf" | "xlsx">("pdf");
  const [enabled, setEnabled] = useState<Set<SectionId>>(
    new Set(["maintenance", "fuel", "parts", "insurance", "faults", "inspections"])
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: cars, isLoading: carsLoading } = useCars<Car>();

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
      const exportUnit = isHourBased(selectedCar.usageUnit) ? t("units.hours") : unit;
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
      const safeName = `${selectedCar.make}_${selectedCar.model}_${selectedCar.year}`.replace(/\s+/g, "_");

      if (format === "pdf") {
        const html = buildPdfHtml(selectedCar, sections, t, isRTL, exportUnit);
        await sharePdf(html);
      } else {
        const wb = buildWorkbook(selectedCar, sections, t, isRTL, exportUnit);
        const filename = `CTL_${safeName}_${Date.now()}.xlsx`;

        if (Platform.OS === "web") {
          const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
          const blob = new Blob([ab], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
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
            const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" }) as string;
            const path = cacheDir + filename;
            await FileSystem.writeAsStringAsync(path, base64, { encoding: "base64" as any });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(path, {
                mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                UTI: "org.openxmlformats.spreadsheetml.sheet",
              });
            }
          } else {
            const html = buildPdfHtml(selectedCar, sections, t, isRTL, exportUnit);
            await sharePdf(html);
            setError(t("export.excelFallback"));
          }
        }
      }
    } catch (e: any) {
      setError(e?.message ?? t("export.exportFailed"));
    } finally {
      setGenerating(false);
    }
  }

  const textAlign = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="download" color="#0F2D5E" bg="#DBEAFE" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign }]}>{t("export.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign }]}>{t("export.subtitle")}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content]} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>{t("export.vehicleLabel")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          {carsLoading ? (
            <ActivityIndicator color={C.tint} style={{ padding: 16 }} />
          ) : !cars?.length ? (
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>{t("export.noVehicles")}</Text>
          ) : (
            cars.map((car, idx) => {
              const active = (selectedCar?.id ?? cars[0]?.id) === car.id;
              return (
                <Pressable
                  key={car.id}
                  onPress={() => { setSelectedCarId(car.id); Haptics.selectionAsync(); }}
                  style={[
                    styles.optionRow,
                    isRTL && { flexDirection: "row-reverse" },
                    idx < cars.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
                  ]}
                >
                  <View style={[styles.radio, { borderColor: active ? C.tint : C.textTertiary }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: C.tint }]} />}
                  </View>
                  <Text style={[styles.optionText, { color: C.text, flex: 1, textAlign }]}>{carLabel(car)}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>{t("export.formatLabel")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          {([
            {
              id: "pdf" as const,
              label: t("export.pdfTitle"),
              sub: t("export.pdfSub"),
              icon: "file-text" as const,
            },
            {
              id: "xlsx" as const,
              label: t("export.xlsxTitle"),
              sub: t("export.xlsxSub"),
              icon: "grid" as const,
            },
          ]).map((f, idx) => {
            const active = format === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => { setFormat(f.id); Haptics.selectionAsync(); }}
                style={[
                  styles.optionRow,
                  isRTL && { flexDirection: "row-reverse" },
                  idx === 0 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
                  { paddingVertical: 14 },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? C.tint : C.textTertiary }]}>
                  {active && <View style={[styles.radioInner, { backgroundColor: C.tint }]} />}
                </View>
                <Feather name={f.icon} size={16} color={active ? C.tint : C.textTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, { color: C.text, textAlign }]}>{f.label}</Text>
                  <Text style={[styles.optionSub, { color: C.textSecondary, textAlign }]}>{f.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>{t("export.includeLabel")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          {SECTIONS.map((s, idx) => {
            const on = enabled.has(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => toggleSection(s.id)}
                style={[
                  styles.optionRow,
                  isRTL && { flexDirection: "row-reverse" },
                  idx < SECTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
                ]}
              >
                <Feather name={s.icon} size={16} color={on ? C.tint : C.textTertiary} style={{ marginHorizontal: 4 }} />
                <Text style={[styles.optionText, { color: on ? C.text : C.textSecondary, flex: 1, textAlign }]}>{sectionName(s.id, t)}</Text>
                <View style={[styles.toggle, { backgroundColor: on ? C.tint : C.border }]}>
                  <View style={[styles.toggleThumb, { transform: [{ translateX: on ? 18 : 2 }] }]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={generate}
          disabled={generating || !selectedCar || enabled.size === 0}
          style={({ pressed }) => [
            styles.generateBtn,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.tint, opacity: pressed || generating || !selectedCar || enabled.size === 0 ? 0.65 : 1 },
          ]}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="share" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>
                {format === "pdf" ? t("export.exportPdf") : t("export.exportXlsx")}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.note, { color: C.textTertiary }]}>
          {t("export.note")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

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
