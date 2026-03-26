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
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
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

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null };

type FuelRecord = {
  id: number;
  carId: number;
  date: string;
  mileage: number;
  liters: number;
  pricePerLiter?: number | null;
  totalCost: number;
  fuelType?: string | null;
  station?: string | null;
  fullTank?: boolean | null;
  notes?: string | null;
};

type EnrichedRecord = FuelRecord & { carLabel: string };

const FUEL_TYPES = ["Petrol", "Diesel", "Premium", "E85", "LPG", "Other"];
const L_PER_GAL = 3.78541;

function calcConsumption(liters: number, distKm: number, unit: "km" | "mi"): string {
  if (distKm <= 0 || liters <= 0) return "—";
  if (unit === "km") return (liters / distKm * 100).toFixed(1) + " L/100km";
  const miles = distKm * 0.621371;
  return (miles / (liters / L_PER_GAL)).toFixed(1) + " mpg";
}

function carLabel(car: Car) {
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
}

export default function FuelScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { unit } = useDistanceUnit();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [showAdd, setShowAdd] = useState(false);
  const [confirmRecord, setConfirmRecord] = useState<{ id: number; carId: number } | null>(null);
  const [filterCarId, setFilterCarId] = useState<number | null>(null);

  // form state
  const [fCarId, setFCarId] = useState<number | null>(null);
  const [fDate, setFDate] = useState(new Date().toISOString().split("T")[0]);
  const [fMileage, setFMileage] = useState("");
  const [fLiters, setFLiters] = useState("");
  const [fPricePerUnit, setFPricePerUnit] = useState("");
  const [fTotalCost, setFTotalCost] = useState("");
  const [fFuelType, setFFuelType] = useState("");
  const [fStation, setFStation] = useState("");
  const [fFullTank, setFFullTank] = useState(true);
  const [fNotes, setFNotes] = useState("");

  const carsQuery = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });
  const cars = carsQuery.data ?? [];

  const fuelQueries = useQueries({
    queries: cars.map((car) => ({
      queryKey: ["fuel", car.id],
      queryFn: () => apiGet<FuelRecord[]>(`/cars/${car.id}/fuel`),
      enabled: cars.length > 0,
    })),
  });
  const isLoadingFuel = fuelQueries.some((q) => q.isLoading);

  const allRecords: EnrichedRecord[] = useMemo(() => {
    const result: EnrichedRecord[] = [];
    fuelQueries.forEach((q, i) => {
      const car = cars[i];
      if (!car || !q.data) return;
      q.data.forEach((r) => result.push({ ...r, carLabel: carLabel(car) }));
    });
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage);
  }, [fuelQueries, cars]);

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
        if (dist > 0 && sorted[i].fullTank !== false) {
          totalConsumptionPairs += sorted[i].liters / dist * 100;
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
        if (dist > 0) map.set(sorted[i].id, calcConsumption(sorted[i].liters, dist, unit));
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
    setFMileage(""); setFLiters(""); setFPricePerUnit(""); setFTotalCost("");
    setFFuelType(""); setFStation(""); setFFullTank(true); setFNotes("");
  };

  const carOptions = cars.map(carLabel);
  const selectedCarLabel = fCarId ? (cars.find((c) => c.id === fCarId) ? carLabel(cars.find((c) => c.id === fCarId)!) : "") : "";
  const handleCarSelect = (label: string) => {
    const car = cars.find((c) => carLabel(c) === label);
    if (car) setFCarId(car.id);
  };

  const addMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${fCarId}/fuel`, {
        date: fDate,
        mileage: parseInt(fMileage),
        liters: parseFloat(fLiters),
        pricePerLiter: fPricePerUnit ? parseFloat(fPricePerUnit) : undefined,
        totalCost: parseFloat(fTotalCost),
        fuelType: fFuelType || undefined,
        station: fStation || undefined,
        fullTank: fFullTank,
        notes: fNotes || undefined,
      }),
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
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="droplet" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Fuel Consumption</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {filterCarId === null ? "All vehicles" : (cars.find((c) => c.id === filterCarId) ? carLabel(cars.find((c) => c.id === filterCarId)!) : "All vehicles")}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (cars.length > 0) {
                if (!fCarId) setFCarId(cars[0].id);
                setShowAdd(true);
              }
            }}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: C.tint, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Car filter pills — only visible when there are multiple cars */}
      {cars.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          style={[styles.pillsContainer, { backgroundColor: C.card, borderBottomColor: C.border }]}
        >
          <Pressable
            onPress={() => setFilterCarId(null)}
            style={[styles.pill, filterCarId === null && { backgroundColor: C.tint }]}
          >
            <Text style={[styles.pillText, { color: filterCarId === null ? "#fff" : C.textSecondary }]}>
              All
            </Text>
          </Pressable>
          {cars.map((car) => {
            const active = filterCarId === car.id;
            return (
              <Pressable
                key={car.id}
                onPress={() => setFilterCarId(car.id)}
                style={[styles.pill, active && { backgroundColor: C.tint }]}
              >
                <Text style={[styles.pillText, { color: active ? "#fff" : C.textSecondary }]} numberOfLines={1}>
                  {carLabel(car)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: C.card }]}>
              <Feather name="trending-up" size={15} color="#2563EB" style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: C.text }]}>{formatAvg(stats.avgL100km)}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Avg. Efficiency</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.card }]}>
              <Feather name="droplet" size={15} color={C.success} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: C.text }]}>{stats.count}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Fill-ups</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.card }]}>
              <Feather name="dollar-sign" size={15} color={C.warning} style={{ marginBottom: 4 }} />
              <Text style={[styles.statValue, { color: C.text }]}>
                {currency.symbol}{stats.totalCost.toFixed(0)}
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total Spent</Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 32 }} />
        ) : cars.length === 0 ? (
          <EmptyState
            icon="truck"
            title="No cars added"
            description="Add a car to your fleet first."
          />
        ) : allRecords.length === 0 ? (
          <EmptyState
            icon="droplet"
            title="No fill-ups logged"
            description="Tap + to log your first fill-up and start tracking fuel efficiency."
            actionLabel="Log Fill-up"
            onAction={() => {
              if (!fCarId && cars.length > 0) setFCarId(cars[0].id);
              setShowAdd(true);
            }}
          />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon="droplet"
            title="No fill-ups for this vehicle"
            description="Log a fill-up for this car to see its stats here."
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
                title={`${r.liters.toFixed(1)} L${r.fuelType ? ` · ${r.fuelType}` : ""}${r.fullTank === false ? " · Partial" : ""}`}
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
          <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>Log Fill-up</Text>
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
                label="Vehicle"
                value={selectedCarLabel}
                onSelect={handleCarSelect}
                options={carOptions}
                placeholder="Select vehicle…"
                required
              />
            </View>

            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <DatePickerField label="Date" value={fDate} onChange={setFDate} />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={`Odometer (${unit})`}
                value={fMileage}
                onChangeText={setFMileage}
                placeholder="e.g. 54200"
                keyboardType="number-pad"
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Amount (L)"
                value={fLiters}
                onChangeText={handleLitersChange}
                placeholder="e.g. 45.0"
                keyboardType="decimal-pad"
                required
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={`Price per litre (${currency.symbol})`}
                value={fPricePerUnit}
                onChangeText={handlePriceChange}
                placeholder="e.g. 1.85"
                keyboardType="decimal-pad"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={`Total cost (${currency.symbol})`}
                value={fTotalCost}
                onChangeText={setFTotalCost}
                placeholder="e.g. 83.25"
                keyboardType="decimal-pad"
                required
              />
            </View>

            <View style={[styles.fieldGroup, { backgroundColor: C.card }]}>
              <SelectField
                label="Fuel Type"
                value={fFuelType}
                onSelect={setFFuelType}
                options={FUEL_TYPES}
                placeholder="Select type…"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Station"
                value={fStation}
                onChangeText={setFStation}
                placeholder="e.g. BP, Shell, Total"
              />
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: C.text }]}>Full tank</Text>
                <Switch
                  value={fFullTank}
                  onValueChange={setFFullTank}
                  trackColor={{ true: C.tint }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label="Notes"
                value={fNotes}
                onChangeText={setFNotes}
                placeholder="Any notes…"
                multiline
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
              label="Save Fill-up"
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!canSubmit}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirmRecord !== null}
        title="Delete Fill-up"
        message="This fill-up record will be permanently deleted."
        confirmLabel="Delete"
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.12)",
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
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
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
