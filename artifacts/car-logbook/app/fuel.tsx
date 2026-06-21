import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { useColors } from "@/context/ThemeContext";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { useCurrency } from "@/context/CurrencyContext";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import BottomNav from "@/components/ui/BottomNav";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordCard } from "@/components/ui/RecordCard";
import { formatDate } from "@/lib/dateUtils";
import { apiGet, apiPost, apiDelete } from "@/hooks/useApi";

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null; isElectric?: boolean | null; tankCapacity?: number | null };

type FuelRecord = {
  id: number;
  carId: number;
  date: string;
  mileage: number;
  liters: number;
  pricePerLiter?: number | null;
  totalCost: number;
  fuelBefore?: number | null;
  tankAfter?: number | null;
  fuelType?: string | null;
  station?: string | null;
  fullTank?: boolean | null;
  notes?: string | null;
};

type EnrichedRecord = FuelRecord & { carLabel: string };

const FUEL_TYPES = ["Petrol", "Diesel", "Premium", "E85", "LPG", "Other"];
const L_PER_GAL = 3.78541;
const GAUGE_LEVELS = ["0", "0.125", "0.25", "0.375", "0.5", "0.625", "0.75", "0.875", "1"];

function calcConsumption(liters: number, distKm: number, unit: "km" | "mi"): string {
  if (distKm <= 0 || liters <= 0) return "—";
  if (unit === "km") return (liters / distKm * 100).toFixed(1) + " L/100km";
  const miles = distKm * 0.621371;
  return (miles / (liters / L_PER_GAL)).toFixed(1) + " mpg";
}

function consumedBetween(prev: FuelRecord, curr: FuelRecord): number | null {
  if (prev.tankAfter != null && curr.fuelBefore != null) {
    const consumed = prev.tankAfter - curr.fuelBefore;
    return consumed > 0 ? consumed : null;
  }
  if (curr.fullTank !== false) return curr.liters;
  return null;
}

function carLabel(car: Car) {
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}

export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { unit } = useDistanceUnit();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const fuelTypeLabels = useMemo(
    () => Object.fromEntries(FUEL_TYPES.map((ft) => [ft, t(`fuelScreen.fuelTypes.${ft}`)])),
    [t]
  );
  const gaugeLabels = useMemo(
    () => Object.fromEntries(GAUGE_LEVELS.map((g) => [g, t(`fuelScreen.gaugeLevels.${g}`)])),
    [t]
  );

  const [showAdd, setShowAdd] = useState(false);
  const [showGaugeInfo, setShowGaugeInfo] = useState(false);
  const [confirmRecord, setConfirmRecord] = useState<{ id: number; carId: number } | null>(null);
  const [filterCarId, setFilterCarId] = useState<number | null>(null);

  // form state
  const [fCarId, setFCarId] = useState<number | null>(null);
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0]);
  const [fMileage, setFMileage] = useState("");
  const [fGauge, setFGauge] = useState("");
  const [fLiters, setFLiters] = useState("");
  const [fPricePerUnit, setFPricePerUnit] = useState("");
  const [fTotalCost, setFTotalCost] = useState("");
  const [fFuelType, setFFuelType] = useState("");
  const [fStation, setFStation] = useState("");
  const [fNotes, setFNotes] = useState("");

  const carsQuery = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });
  const cars = carsQuery.data ?? [];
  const fuelCars = useMemo(() => cars.filter((c) => !c.isElectric), [cars]);

  const fuelQueries = useQueries({
    queries: fuelCars.map((car) => ({
      queryKey: ["fuel", car.id],
      queryFn: () => apiGet<FuelRecord[]>(`/cars/${car.id}/fuel`),
      enabled: fuelCars.length > 0,
    })),
  });
  const isLoadingFuel = fuelQueries.some((q) => q.isLoading);

  const allRecords: EnrichedRecord[] = useMemo(() => {
    const result: EnrichedRecord[] = [];
    fuelQueries.forEach((q, i) => {
      const car = fuelCars[i];
      if (!car || !q.data) return;
      q.data.forEach((r) => result.push({ ...r, carLabel: carLabel(car) }));
    });
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage);
  }, [fuelQueries, fuelCars]);

  const filteredRecords = useMemo(
    () => filterCarId === null ? allRecords : allRecords.filter((r) => r.carId === filterCarId),
    [allRecords, filterCarId]
  );

  // Stats for current filter
  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return null;
    const byCarId = new Map<number, FuelRecord[]>();
    filteredRecords.forEach((r) => {
      if (!byCarId.has(r.carId)) byCarId.set(r.carId, []);
      byCarId.get(r.carId)!.push(r);
    });
    let totalConsumptionPairs = 0;
    let consumptionPairCount = 0;
    byCarId.forEach((carRecords) => {
      const sorted = [...carRecords].sort((a, b) => a.mileage - b.mileage);
      for (let i = 1; i < sorted.length; i++) {
        const dist = sorted[i].mileage - sorted[i - 1].mileage;
        const consumed = consumedBetween(sorted[i - 1], sorted[i]);
        if (dist > 0 && consumed !== null) {
          totalConsumptionPairs += consumed / dist * 100;
          consumptionPairCount++;
        }
      }
    });
    const avgL100km = consumptionPairCount > 0 ? totalConsumptionPairs / consumptionPairCount : null;
    const totalCost = filteredRecords.reduce((s, r) => s + r.totalCost, 0);
    return { avgL100km, totalCost, count: filteredRecords.length };
  }, [filteredRecords]);

  const consumptionMap = useMemo(() => {
    const map = new Map<number, string>();
    const byCarId = new Map<number, FuelRecord[]>();
    filteredRecords.forEach((r) => {
      if (!byCarId.has(r.carId)) byCarId.set(r.carId, []);
      byCarId.get(r.carId)!.push(r);
    });
    byCarId.forEach((carRecords) => {
      const sorted = [...carRecords].sort((a, b) => a.mileage - b.mileage);
      for (let i = 1; i < sorted.length; i++) {
        const dist = sorted[i].mileage - sorted[i - 1].mileage;
        const consumed = consumedBetween(sorted[i - 1], sorted[i]);
        if (dist > 0 && consumed !== null) map.set(sorted[i].id, calcConsumption(consumed, dist, unit));
      }
    });
    return map;
  }, [filteredRecords, unit]);

  const formatAvg = (avgL100km: number | null) => {
    if (avgL100km === null) return "—";
    if (unit === "km") return avgL100km.toFixed(1) + " L/100km";
    return (L_PER_GAL / (avgL100km / 100) * 0.621371).toFixed(1) + " mpg";
  };

  const handleLitersChange = (val: string) => {
    setFLiters(val);
    const l = parseFloat(val), p = parseFloat(fPricePerUnit);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) setFTotalCost((l * p).toFixed(2));
  };

  const handlePriceChange = (val: string) => {
    setFPricePerUnit(val);
    const l = parseFloat(fLiters), p = parseFloat(val);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) setFTotalCost((l * p).toFixed(2));
  };

  const resetForm = () => {
    setFDate(new Date().toISOString().split("T")[0]);
    setFMileage(""); setFGauge(""); setFLiters(""); setFPricePerUnit(""); setFTotalCost("");
    setFFuelType(""); setFStation(""); setFNotes("");
  };

  const carOptions = fuelCars.map(carLabel);
  const selectedFuelCar = fCarId ? fuelCars.find((c) => c.id === fCarId) ?? null : null;
  const selectedCarLabel = selectedFuelCar ? carLabel(selectedFuelCar) : "";
  const handleCarSelect = (label: string) => {
    const car = fuelCars.find((c) => carLabel(c) === label);
    if (car) {
      setFCarId(car.id);
      setFGauge("");
    }
  };

  const addMutation = useMutation({
    mutationFn: () => {
      const capacity = selectedFuelCar?.tankCapacity ?? null;
      const amount = parseFloat(fLiters);
      const fuelBeforeL =
        capacity != null && fGauge !== "" ? capacity * parseFloat(fGauge) : null;
      const tankAfterL =
        fuelBeforeL != null && !isNaN(amount) ? fuelBeforeL + amount : null;
      return apiPost(`/cars/${fCarId}/fuel`, {
        date: fDate,
        mileage: parseInt(fMileage),
        liters: amount,
        pricePerLiter: fPricePerUnit ? parseFloat(fPricePerUnit) : undefined,
        totalCost: parseFloat(fTotalCost),
        fuelBefore: fuelBeforeL != null ? Math.round(fuelBeforeL * 10) / 10 : undefined,
        tankAfter: tankAfterL != null ? Math.round(tankAfterL * 10) / 10 : undefined,
        fuelType: fFuelType || undefined,
        station: fStation || undefined,
        notes: fNotes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel", fCarId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, carId }: { id: number; carId: number }) =>
      apiDelete(`/cars/${carId}/fuel/${id}`),
    onSuccess: (_, { carId }) => {
      qc.invalidateQueries({ queryKey: ["fuel", carId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmRecord(null);
    },
  });

  const canSubmit =
    fCarId !== null &&
    fMileage.trim() !== "" && !isNaN(parseInt(fMileage)) &&
    fLiters.trim() !== "" && !isNaN(parseFloat(fLiters)) &&
    fTotalCost.trim() !== "" && !isNaN(parseFloat(fTotalCost));

  const isLoading = carsQuery.isLoading || isLoadingFuel;

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      {/* Header — matches maintenance/faults pattern */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="droplet" color="#2563EB" bg="#DBEAFE" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("fuelScreen.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {filterCarId === null ? t("fuelScreen.allVehicles") : (fuelCars.find((c) => c.id === filterCarId) ? carLabel(fuelCars.find((c) => c.id === filterCarId)!) : t("fuelScreen.allVehicles"))}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (fuelCars.length > 0) {
                setFCarId(filterCarId ?? fCarId ?? fuelCars[0].id);
                setShowAdd(true);
              }
            }}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Car filter pills — only visible when there are multiple non-EV cars */}
      {fuelCars.length > 1 && (
        <View style={[styles.pillsContainer, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <View style={[styles.pillsRow, isRTL && { flexDirection: "row-reverse" }]}>
            <Pressable
              onPress={() => setFilterCarId(null)}
              style={[styles.pill, filterCarId === null && { backgroundColor: C.tint }]}
            >
              <Text style={[styles.pillText, { color: filterCarId === null ? "#fff" : C.textSecondary }]}>
                {t("fuelScreen.filterAll")}
              </Text>
            </Pressable>
            {fuelCars.map((car) => {
              const active = filterCarId === car.id;
              return (
                <Pressable
                  key={car.id}
                  onPress={() => setFilterCarId(car.id)}
                  style={[styles.pill, active && { backgroundColor: C.tint }]}
                >
                  <Text style={[styles.pillText, { color: active ? "#fff" : C.textSecondary }]}>
                    {carLabel(car)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        {stats && (
          <View style={[styles.statsRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.statCard, { backgroundColor: C.card }]}>
              <Feather name="trending-up" size={15} color="#2563EB" style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: C.text }]}>{formatAvg(stats.avgL100km)}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t("fuelScreen.avgEfficiency")}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.card }]}>
              <Feather name="droplet" size={15} color={C.success} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: C.text }]}>{stats.count}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t("fuelScreen.fillUps")}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.card }]}>
              <Feather name="dollar-sign" size={15} color={C.warning} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: C.text }]}>
                {currency.symbol}{stats.totalCost.toFixed(0)}
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t("fuelScreen.totalSpent")}</Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 32 }} />
        ) : fuelCars.length === 0 ? (
          <EmptyState
            icon="zap"
            title={t("fuelScreen.noFuelCarsTitle")}
            description={t("fuelScreen.noFuelCarsDesc")}
          />
        ) : allRecords.length === 0 ? (
          <EmptyState
            icon="droplet"
            title={t("fuelScreen.noRecordsTitle")}
            description={t("fuelScreen.noRecordsDesc")}
            actionLabel={t("fuelScreen.logFillUp")}
            onAction={() => {
              if (fuelCars.length > 0) setFCarId(filterCarId ?? fCarId ?? fuelCars[0].id);
              setShowAdd(true);
            }}
          />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon="droplet"
            title={t("fuelScreen.noRecordsForCarTitle")}
            description={t("fuelScreen.noRecordsForCarDesc")}
          />
        ) : (
          filteredRecords.map((r) => {
            const effText = consumptionMap.get(r.id);
            const subtitleParts = [
              filterCarId === null ? r.carLabel : null,
              formatDate(r.date),
              `${r.mileage.toLocaleString()} ${unit}`,
              r.station,
            ].filter(Boolean);
            return (
              <RecordCard
                key={r.id}
                icon="droplet"
                iconColor="#2563EB"
                iconBg="#DBEAFE"
                title={`${r.liters.toFixed(1)} L${r.fuelType ? ` · ${fuelTypeLabels[r.fuelType] ?? r.fuelType}` : ""}${r.fullTank === false ? ` · ${t("fuelScreen.partial")}` : ""}`}
                subtitle={subtitleParts.join(" · ")}
                rightText={`${currency.symbol}${r.totalCost.toFixed(2)}`}
                rightSubtext={effText}
                onDelete={() => setConfirmRecord({ id: r.id, carId: r.carId })}
              />
            );
          })
        )}
      </ScrollView>

      {/* Add Fill-up Modal */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <KeyboardAvoidingView
          style={[styles.sheet, { backgroundColor: C.backgroundSecondary }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: C.border }, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>{t("fuelScreen.logFillUp")}</Text>
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
                label={t("fuelScreen.vehicle")}
                value={selectedCarLabel}
                onSelect={handleCarSelect}
                options={carOptions}
                placeholder={t("fuelScreen.selectVehicle")}
                required
              />
            </View>

            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <DatePickerField label={t("fuelScreen.date")} value={fDate} onChange={setFDate} />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("fuelScreen.odometer", { unit })}
                value={fMileage}
                onChangeText={setFMileage}
                placeholder={t("fuelScreen.odoPlaceholder")}
                keyboardType="number-pad"
                required
              />
            </View>

            <View style={[styles.sectionLabelRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left", marginTop: 0, marginBottom: 0, marginHorizontal: 0 }]}>
                {t("fuelScreen.sectionBefore")}
              </Text>
              <Pressable onPress={() => setShowGaugeInfo(true)} hitSlop={12} style={styles.helpBtn}>
                <Feather name="help-circle" size={16} color={C.textSecondary} />
              </Pressable>
            </View>
            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <Text style={[styles.tankBarLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                {t("fuelScreen.gaugeLevel")}
              </Text>
              <View style={[styles.tankBar, { backgroundColor: C.backgroundTertiary, borderColor: C.border }]}>
                <View
                  style={[
                    styles.tankFill,
                    { backgroundColor: C.tint, width: `${(fGauge !== "" ? parseFloat(fGauge) : 0) * 100}%` },
                    isRTL ? { right: 0 } : { left: 0 },
                  ]}
                />
                <View style={[styles.tankZones, isRTL && { flexDirection: "row-reverse" }]}>
                  {GAUGE_LEVELS.map((g) => {
                    const filled = fGauge !== "" && parseFloat(g) <= parseFloat(fGauge);
                    return (
                      <Pressable
                        key={g}
                        style={styles.tankZone}
                        onPress={() => {
                          setFGauge(g);
                          Haptics.selectionAsync();
                        }}
                      >
                        <Text
                          style={[
                            styles.tankZoneLabel,
                            { color: filled ? "#FFFFFF" : C.textSecondary },
                            fGauge === g && styles.tankZoneLabelActive,
                          ]}
                        >
                          {t(`fuelScreen.gaugeShort.${g}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("fuelScreen.sectionFill")}
            </Text>
            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <FormField
                label={t("fuelScreen.amount")}
                value={fLiters}
                onChangeText={handleLitersChange}
                placeholder={t("fuelScreen.amountPlaceholder")}
                keyboardType="decimal-pad"
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("fuelScreen.pricePerLitre", { symbol: currency.symbol })}
                value={fPricePerUnit}
                onChangeText={handlePriceChange}
                placeholder={t("fuelScreen.pricePlaceholder")}
                keyboardType="decimal-pad"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("fuelScreen.totalCost", { symbol: currency.symbol })}
                value={fTotalCost}
                onChangeText={setFTotalCost}
                placeholder={t("fuelScreen.totalPlaceholder")}
                keyboardType="decimal-pad"
                required
              />
            </View>

            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <SelectField
                label={t("fuelScreen.fuelType")}
                value={fFuelType}
                onSelect={setFFuelType}
                options={FUEL_TYPES}
                optionLabels={fuelTypeLabels}
                placeholder={t("fuelScreen.selectType")}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("fuelScreen.station")}
                value={fStation}
                onChangeText={setFStation}
                placeholder={t("fuelScreen.stationPlaceholder")}
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("fuelScreen.notes")}
                value={fNotes}
                onChangeText={setFNotes}
                placeholder={t("fuelScreen.notesPlaceholder")}
                multiline
              />
            </View>

            {addMutation.isError && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Text style={[styles.errorText, { color: C.danger }]}>
                  {t("fuelScreen.saveError")}
                </Text>
              </View>
            )}

            <PrimaryButton
              label={t("fuelScreen.saveFillUp")}
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!canSubmit}
            />
          </ScrollView>

          {showGaugeInfo && (
            <Pressable style={styles.infoOverlay} onPress={() => setShowGaugeInfo(false)}>
              <Pressable style={[styles.infoCard, { backgroundColor: C.card }]} onPress={() => {}}>
                <View style={[styles.infoHeader, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="info" size={20} color={C.text} />
                  <Text style={[styles.infoTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
                    {t("fuelScreen.gaugeInfoTitle")}
                  </Text>
                </View>
                <Text style={[styles.infoBody, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {t("fuelScreen.gaugeInfoBody")}
                </Text>
                <PrimaryButton label={t("common.gotIt")} onPress={() => setShowGaugeInfo(false)} />
              </Pressable>
            </Pressable>
          )}
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirmRecord !== null}
        title={t("fuelScreen.deleteTitle")}
        message={t("fuelScreen.deleteMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={() => confirmRecord && deleteMutation.mutate(confirmRecord)}
        onCancel={() => setConfirmRecord(null)}
        destructive
      />

      <BottomNav active="tools" />
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  content: { padding: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: "center",
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  pillsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetBody: { padding: 20, gap: 16 },
  fieldGroup: { borderRadius: 14, padding: 16, gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -4 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 6, marginHorizontal: 4 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 6, marginHorizontal: 4 },
  helpBtn: { alignItems: "center", justifyContent: "center" },
  gaugeHint: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tankBarLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tankBar: { height: 52, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", justifyContent: "center" },
  tankFill: { position: "absolute", top: 0, bottom: 0 },
  tankZones: { flexDirection: "row", flex: 1 },
  tankZone: { flex: 1, alignItems: "center", justifyContent: "center" },
  tankZoneLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tankZoneLabelActive: { fontFamily: "Inter_700Bold" },
  infoOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 28 },
  infoCard: { borderRadius: 16, padding: 22, gap: 16 },
  infoHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  infoBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
