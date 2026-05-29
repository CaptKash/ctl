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
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";
import { useCurrency } from "@/context/CurrencyContext";

const CARD_OUTLINE = "#94A3B8";

const METALLIC = {
  greenSoft: ["#ECFDF5", "#D1FAE5", "#A7F3D0"] as const,
  fault: ["#FEF2F2", "#FECACA", "#FCA5A5"] as const,
  repair: ["#FFFBEB", "#FEF3C7", "#FDE68A"] as const,
  renewal: ["#F0FDFA", "#CCFBF1", "#99F6E4"] as const,
};

const TYPE_COLORS = {
  fault: { icon: "#DC2626", border: "#DC2626" },
  repair: { icon: "#D97706", border: "#D97706" },
  renewal: { icon: "#0D9488", border: "#0D9488" },
};

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
  shopAddress?: string | null;
  shopPhone?: string | null;
  cost?: number | null;
  costOfParts?: number | null;
  laborCost?: number | null;
  warrantyPeriod?: string | null;
  car: CarStub | null;
};

type RenewalRecord = {
  id: number;
  carId: number;
  type: "license" | "insurance";
  date: string;
  validUntil?: string | null;
  provider?: string | null;
  referenceNumber?: string | null;
  cost?: number | null;
  car: CarStub | null;
};

type HistoryItem = {
  key: string;
  carId: number;
  type: "malfunction" | "maintenance" | "renewal";
  date: string;
  title: string;
  carName: string;
  completed: boolean;
  // fault
  phase?: string | null;
  // repair
  serviceType?: string | null;
  correctiveAction?: string | null;
  shop?: string | null;
  shopAddress?: string | null;
  warrantyPeriod?: string | null;
  cost?: number | null;
  // renewal
  renewalType?: "license" | "insurance";
  provider?: string | null;
  validUntil?: string | null;
  referenceNumber?: string | null;
};

function carLabel(car: CarStub | null, unknownLabel: string): string {
  if (!car) return unknownLabel;
  return `${car.year} ${car.make} ${car.model}`;
}

function field(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<div class="field"><div class="fl">${label}</div><div class="fv">${value}</div></div>`;
}

const GROUP_META = [
  { type: "malfunction", cls: "fault", labelKey: "generateReport.faults" },
  { type: "maintenance", cls: "repair", labelKey: "generateReport.repairs" },
  { type: "renewal", cls: "renewal", labelKey: "generateReport.renewals" },
] as const;

function detailPair(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<span class="dp"><span class="dl">${label}:</span> ${value}</span>`;
}

function renderRow(
  ev: HistoryItem,
  t: TFunction,
  currencySymbol: string
): string {
  const typeLabel =
    ev.type === "malfunction"
      ? t("generateReport.doc.badgeFault")
      : ev.type === "renewal"
        ? t("generateReport.doc.badgeRenewal")
        : t("generateReport.doc.badgeRepair");
  const cls =
    ev.type === "malfunction" ? "fault" : ev.type === "renewal" ? "renewal" : "repair";
  let titleHtml = "";
  const parts: string[] = [];

  if (ev.type === "malfunction") {
    titleHtml = ev.title;
    const statusClass = ev.completed ? "resolved" : "active";
    const statusText = ev.completed
      ? t("generateReport.doc.resolved")
      : t("generateReport.doc.active");
    parts.push(`<span class="status status-${statusClass}">${statusText}</span>`);
    if (ev.phase) {
      parts.push(detailPair(t("generateReport.doc.phase"), ev.phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())));
    }
  } else if (ev.type === "maintenance") {
    titleHtml = ev.serviceType ?? ev.title;
    if (ev.correctiveAction && ev.correctiveAction !== ev.serviceType) parts.push(detailPair(t("generateReport.doc.description"), ev.correctiveAction));
    parts.push(detailPair(t("generateReport.doc.shop"), ev.shop));
    if (ev.shopAddress) parts.push(detailPair(t("generateReport.doc.address"), ev.shopAddress));
    if (ev.cost != null) parts.push(detailPair(t("generateReport.doc.cost"), `${currencySymbol}${ev.cost.toFixed(2)}`));
    parts.push(detailPair(t("generateReport.doc.warranty"), ev.warrantyPeriod));
  } else {
    titleHtml = ev.renewalType === "license"
      ? t("generateReport.doc.licenseRenewal")
      : t("generateReport.doc.insuranceRenewal");
    parts.push(detailPair(t("generateReport.doc.provider"), ev.provider));
    if (ev.cost != null) parts.push(detailPair(t("generateReport.doc.cost"), `${currencySymbol}${ev.cost.toFixed(2)}`));
    if (ev.validUntil) parts.push(detailPair(t("generateReport.doc.expiryDate"), formatDate(ev.validUntil)));
    parts.push(detailPair(t("generateReport.doc.reference"), ev.referenceNumber));
  }

  const detailsHtml = parts.filter(Boolean).join(" ");

  return `
    <tr class="rec-row ${cls}">
      <td class="c-date">${formatDate(ev.date)}</td>
      <td class="c-type"><span class="badge ${cls}">${typeLabel}</span></td>
      <td class="c-rec">
        <span class="rec-title">${titleHtml}</span>
        ${detailsHtml ? `<span class="rec-details">${detailsHtml}</span>` : ""}
      </td>
    </tr>`;
}

function buildHtml(
  items: HistoryItem[],
  filterLabel: string,
  t: TFunction,
  isRTL: boolean,
  currencySymbol: string
): string {
  const now = new Date().toLocaleDateString(isRTL ? "ar" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const counts = {
    malfunction: items.filter((ev) => ev.type === "malfunction").length,
    maintenance: items.filter((ev) => ev.type === "maintenance").length,
    renewal: items.filter((ev) => ev.type === "renewal").length,
  } as const;

  const chips = GROUP_META.map((g) => {
    const n = counts[g.type];
    if (n === 0) return "";
    return `<div class="stat ${g.cls}"><span class="stat-num">${n}</span><span class="stat-label">${t(g.labelKey)}</span></div>`;
  }).join("");

  const carOrder: { id: number; name: string }[] = [];
  const seenCars = new Set<number>();
  for (const ev of items) {
    if (!seenCars.has(ev.carId)) {
      seenCars.add(ev.carId);
      carOrder.push({ id: ev.carId, name: ev.carName });
    }
  }
  carOrder.sort((a, b) => a.name.localeCompare(b.name));

  const groups = carOrder.map((car) => {
    const carItems = items
      .filter((ev) => ev.carId === car.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (carItems.length === 0) return "";
    const rows = carItems.map((ev) => renderRow(ev, t, currencySymbol)).join("");
    return `
    <section class="car-group">
      <table class="rec-table">
        <thead>
          <tr class="car-head">
            <th colspan="3">
              <span class="car-name">${car.name}</span>
              <span class="car-total">${t("generateReport.doc.records", { count: carItems.length })}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </section>`;
  }).join("");

  const dir = isRTL ? "rtl" : "ltr";
  const lang = isRTL ? "ar" : "en";

  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${t("generateReport.doc.title")}</title>
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
    .report { max-width: 820px; margin: 0 auto; }

    .report-header {
      background: linear-gradient(135deg, #047857 0%, #064E3B 100%);
      color: #fff;
      border-radius: 18px;
      padding: 26px 28px 22px;
      margin-bottom: 20px;
      box-shadow: 0 6px 18px rgba(4,120,87,0.25);
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .brand-mark {
      width: 46px; height: 46px; border-radius: 13px;
      background: rgba(255,255,255,0.16);
      border: 1px solid rgba(255,255,255,0.4);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; letter-spacing: 1.5px;
    }
    .brand-name { font-size: 15px; font-weight: 700; }
    .brand-sub { font-size: 12px; opacity: 0.82; }
    .report-header h1 { font-size: 25px; font-weight: 800; margin-bottom: 9px; letter-spacing: -0.3px; }
    .meta-row { font-size: 13px; opacity: 0.92; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .meta-row .dot { opacity: 0.45; }

    .summary-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 26px; }
    .stat {
      flex: 1; min-width: 120px;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 14px; padding: 14px 16px;
      border-top: 3px solid #e2e8f0;
    }
    .stat.fault { border-top-color: #DC2626; }
    .stat.repair { border-top-color: #D97706; }
    .stat.renewal { border-top-color: #0D9488; }
    .stat-num { display: block; font-size: 26px; font-weight: 800; line-height: 1.1; }
    .stat-label { font-size: 12px; color: #64748b; font-weight: 600; }

    .car-group { margin-bottom: 26px; }
    .rec-table {
      width: 100%; border-collapse: collapse;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 13px;
      overflow: hidden; table-layout: fixed;
    }
    .car-head th {
      text-align: start;
      padding: 13px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      border-inline-start: 4px solid #047857;
    }
    .car-name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
    .car-total { font-size: 12px; font-weight: 700; color: #047857; background: #D1FAE5; border-radius: 999px; padding: 3px 11px; white-space: nowrap; margin-inline-start: 10px; }

    .rec-row td {
      padding: 12px 16px;
      border-top: 1px solid #eef2f6;
      vertical-align: top;
    }
    .c-date { width: 92px; font-size: 12px; color: #64748b; font-weight: 600; white-space: nowrap; }
    .c-type { width: 92px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .badge.fault { background: #FEE2E2; color: #DC2626; }
    .badge.repair { background: #FEF3C7; color: #B45309; }
    .badge.renewal { background: #CCFBF1; color: #0D9488; }
    .c-rec .rec-title { display: block; font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .c-rec .rec-details { display: block; font-size: 12px; color: #64748b; line-height: 1.7; }
    .dp { margin-inline-end: 14px; white-space: nowrap; }
    .dl { color: #94a3b8; font-weight: 600; }
    .status { display: inline-block; font-weight: 700; padding: 1px 9px; border-radius: 6px; font-size: 11px; margin-inline-end: 14px; }
    .status-resolved { color: #047857; background: #D1FAE5; }
    .status-active { color: #DC2626; background: #FEE2E2; }

    [dir="rtl"] .brand-mark { letter-spacing: 0; }

    @media print {
      body { padding: 0; background: #fff; }
      .report-header, .stat, .rec-table, .badge, .status, .car-head th {
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .report-header { box-shadow: none; }
      .car-group, .rec-row { break-inside: avoid; }
      .stat { break-inside: avoid; }
    }
  </style></head><body>
  <div class="report">
    <header class="report-header">
      <div class="brand">
        <div class="brand-mark">${t("common.appName")}</div>
        <div class="brand-text">
          <div class="brand-name">${t("common.appName")}</div>
          <div class="brand-sub">${t("common.appTagline")}</div>
        </div>
      </div>
      <h1>${t("generateReport.doc.title")}</h1>
      <div class="meta-row">
        <span>${t("generateReport.doc.generated", { date: now })}</span>
        <span class="dot">·</span>
        <span>${filterLabel}</span>
        <span class="dot">·</span>
        <span>${t("generateReport.doc.records", { count: items.length })}</span>
      </div>
    </header>
    ${chips ? `<div class="summary-bar">${chips}</div>` : ""}
    ${groups}
  </div>
  </body></html>`;
}

async function openReport(
  items: HistoryItem[],
  filterLabel: string,
  t: TFunction,
  isRTL: boolean,
  currencySymbol: string
) {
  const html = buildHtml(items, filterLabel, t, isRTL, currencySymbol);

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
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: t("generateReport.doc.title") });
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
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const rtlText = isRTL ? { textAlign: "right" as const, writingDirection: "rtl" as const } : null;
  const { currency } = useCurrency();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId: carIdParam } = useLocalSearchParams<{ carId?: string }>();

  const parsedCarIdParam = carIdParam ? parseInt(carIdParam) : null;
  const [selectedCarIds, setSelectedCarIds] = useState<number[]>(
    parsedCarIdParam && !isNaN(parsedCarIdParam) ? [parsedCarIdParam] : []
  );
  const [includeFaults, setIncludeFaults] = useState(true);
  const [includeRepairs, setIncludeRepairs] = useState(true);
  const [includeRenewals, setIncludeRenewals] = useState(true);

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

  const renewalsQuery = useQuery<RenewalRecord[]>({
    queryKey: ["renewals-all"],
    queryFn: () => apiGet<RenewalRecord[]>("/renewals"),
  });

  const isLoading = carsQuery.isLoading || faultsQuery.isLoading || repairsQuery.isLoading || renewalsQuery.isLoading;

  const cars: CarStub[] = carsQuery.data ?? [];
  const unknownCar = t("generateReport.unknownCar");

  const allItems: HistoryItem[] = React.useMemo(() => {
    const faults = (faultsQuery.data ?? []).map((r): HistoryItem => ({
      key: `malfunction-${r.id}`,
      carId: r.carId,
      type: "malfunction",
      date: r.date,
      title: r.description,
      carName: carLabel(r.car, unknownCar),
      completed: r.completed,
      phase: r.phase,
    }));

    const repairs = (repairsQuery.data ?? []).map((r): HistoryItem => ({
      key: `maintenance-${r.id}`,
      carId: r.carId,
      type: "maintenance",
      date: r.date,
      title: r.description,
      carName: carLabel(r.car, unknownCar),
      completed: false,
      serviceType: r.type,
      correctiveAction: r.description,
      shop: r.shop,
      shopAddress: r.shopAddress,
      cost: r.cost != null ? r.cost : ((r.costOfParts ?? 0) + (r.laborCost ?? 0)) || null,
      warrantyPeriod: r.warrantyPeriod,
    }));

    const renewals = (renewalsQuery.data ?? []).map((r): HistoryItem => ({
      key: `renewal-${r.id}`,
      carId: r.carId,
      type: "renewal",
      date: r.date,
      title: r.type === "license"
        ? t("generateReport.doc.licenseRenewal")
        : t("generateReport.doc.insuranceRenewal"),
      carName: carLabel(r.car, unknownCar),
      completed: false,
      renewalType: r.type,
      provider: r.provider,
      validUntil: r.validUntil,
      referenceNumber: r.referenceNumber,
      cost: r.cost,
    }));

    return [...faults, ...repairs, ...renewals].sort((a, b) => b.date.localeCompare(a.date));
  }, [faultsQuery.data, repairsQuery.data, renewalsQuery.data, unknownCar, t]);

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
    if (!includeRenewals && ev.type === "renewal") return false;
    return true;
  });

  const canGenerate = (includeFaults || includeRepairs || includeRenewals) && filteredItems.length > 0;

  async function handleGenerate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let carPart: string;
    if (allSelected) {
      carPart = t("generateReport.filter.allCars");
    } else if (selectedCarIds.length === 1) {
      const [id] = selectedCarIds;
      carPart = carLabel(cars.find((c) => c.id === id) ?? null, unknownCar);
    } else {
      carPart = t("generateReport.filter.nCars", { count: selectedCarIds.length });
    }
    const typePart = [
      includeFaults && t("generateReport.faults"),
      includeRepairs && t("generateReport.repairs"),
      includeRenewals && t("generateReport.renewals"),
    ].filter(Boolean).join(" · ");
    await openReport(filteredItems, `${carPart} · ${typePart}`, t, isRTL, currency.symbol);
  }

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#ECFDF5", "#34D399", "#047857"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, styles.iconBoxMetallicGreen]}
          >
            <Feather name="file-text" size={22} color="#064E3B" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }, rtlText]}>{t("generateReport.title")}</Text>
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
          <Text style={[styles.sectionLabel, { color: C.textSecondary }, rtlText]}>{t("generateReport.carsLabel")}</Text>
          <View style={[styles.cardFrame, { backgroundColor: CARD_OUTLINE }]}>
            <View style={[styles.cardInner, { backgroundColor: C.card }]}>
              {/* All Cars toggle */}
              <Pressable
                onPress={selectAll}
                style={[styles.optionRow, isRTL && { flexDirection: "row-reverse" }, { borderBottomColor: C.border, borderBottomWidth: cars.length > 0 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <Text style={[styles.optionText, { color: C.text }, rtlText]}>{t("generateReport.allCars")}</Text>
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
                    style={[styles.optionRow, isRTL && { flexDirection: "row-reverse" }, { borderBottomColor: C.border, borderBottomWidth: i < cars.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
                  >
                    <Text style={[styles.optionText, { color: C.text }, rtlText]}>{carLabel(car, unknownCar)}</Text>
                    <View style={[styles.checkbox, { borderColor: checked ? "#059669" : C.border, backgroundColor: checked ? "#059669" : "transparent" }]}>
                      {checked && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Record types */}
          <Text style={[styles.sectionLabel, { color: C.textSecondary }, rtlText]}>{t("generateReport.recordTypesLabel")}</Text>
          <View style={[styles.cardFrame, { backgroundColor: CARD_OUTLINE }]}>
            <View style={[styles.cardInner, { backgroundColor: C.card }]}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setIncludeFaults((v) => !v); }}
                style={[styles.optionRow, isRTL && { flexDirection: "row-reverse" }, { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={[styles.optionLeft, isRTL && { flexDirection: "row-reverse" }]}>
                  <LinearGradient colors={METALLIC.fault} locations={[0, 0.55, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[styles.typeDot, { borderColor: TYPE_COLORS.fault.border }]}>
                    <Feather name="alert-triangle" size={14} color={TYPE_COLORS.fault.icon} />
                  </LinearGradient>
                  <Text style={[styles.optionText, { color: C.text }, rtlText]}>{t("generateReport.faults")}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: includeFaults ? TYPE_COLORS.fault.border : C.border, backgroundColor: includeFaults ? TYPE_COLORS.fault.border : "transparent" }]}>
                  {includeFaults && <Feather name="check" size={12} color="#fff" />}
                </View>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setIncludeRepairs((v) => !v); }}
                style={[styles.optionRow, isRTL && { flexDirection: "row-reverse" }, { borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={[styles.optionLeft, isRTL && { flexDirection: "row-reverse" }]}>
                  <LinearGradient colors={METALLIC.repair} locations={[0, 0.55, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[styles.typeDot, { borderColor: TYPE_COLORS.repair.border }]}>
                    <Feather name="clipboard" size={14} color={TYPE_COLORS.repair.icon} />
                  </LinearGradient>
                  <Text style={[styles.optionText, { color: C.text }, rtlText]}>{t("generateReport.repairs")}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: includeRepairs ? TYPE_COLORS.repair.border : C.border, backgroundColor: includeRepairs ? TYPE_COLORS.repair.border : "transparent" }]}>
                  {includeRepairs && <Feather name="check" size={12} color="#fff" />}
                </View>
              </Pressable>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setIncludeRenewals((v) => !v); }}
                style={[styles.optionRow, isRTL && { flexDirection: "row-reverse" }]}
              >
                <View style={[styles.optionLeft, isRTL && { flexDirection: "row-reverse" }]}>
                  <LinearGradient colors={METALLIC.renewal} locations={[0, 0.55, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={[styles.typeDot, { borderColor: TYPE_COLORS.renewal.border }]}>
                    <Feather name="refresh-cw" size={14} color={TYPE_COLORS.renewal.icon} />
                  </LinearGradient>
                  <Text style={[styles.optionText, { color: C.text }, rtlText]}>{t("generateReport.renewals")}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: includeRenewals ? TYPE_COLORS.renewal.border : C.border, backgroundColor: includeRenewals ? TYPE_COLORS.renewal.border : "transparent" }]}>
                  {includeRenewals && <Feather name="check" size={12} color="#fff" />}
                </View>
              </Pressable>
            </View>
          </View>

          {/* Summary */}
          <LinearGradient
            colors={METALLIC.greenSoft}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summary, isRTL && { flexDirection: "row-reverse" }, { borderColor: "#6EE7B7" }]}
          >
            <Feather name="info" size={15} color="#047857" />
            <Text style={[styles.summaryText, rtlText]}>
              {canGenerate
                ? t("generateReport.willInclude", { count: filteredItems.length })
                : filteredItems.length === 0
                  ? t("generateReport.noMatch")
                  : t("generateReport.selectType")}
            </Text>
          </LinearGradient>

          {/* Generate button */}
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate}
            style={({ pressed }) => [styles.generateWrap, { opacity: !canGenerate ? 0.45 : pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={["#DBEAFE", "#BFDBFE", "#93C5FD"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[styles.generateBtn, isRTL && { flexDirection: "row-reverse" }]}
            >
              <Feather name="file-text" size={17} color="#312E81" />
              <Text style={styles.generateBtnText}>{t("generateReport.generate")}</Text>
            </LinearGradient>
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
  iconBoxMetallicGreen: {
    borderWidth: 1,
    borderColor: "#064E3B",
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
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
  cardFrame: {
    borderRadius: 16,
    padding: 1.5,
    shadowColor: "rgba(0,0,0,0.12)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  cardInner: {
    borderRadius: 15,
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
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 1.5,
    elevation: 2,
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

  generateWrap: {
    marginTop: 12,
    borderRadius: 14,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1E40AF",
    paddingVertical: 16,
  },
  generateBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#312E81" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
