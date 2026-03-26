import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { useCurrency } from "@/context/CurrencyContext";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
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

const FUEL_TYPES = ["Petrol", "Diesel", "Premium", "E85", "LPG", "Other"];

const L_PER_GAL = 3.78541;

function calcConsumption(liters: number, distanceKm: number, unit: "km" | "mi"): string {
  if (distanceKm <= 0 || liters <= 0) return "—";
  if (unit === "km") {
    return (liters / distanceKm * 100).toFixed(1) + " L/100km";
  } else {
    const miles = distanceKm * 0.621371;
    const gallons = liters / L_PER_GAL;
    return (miles / gallons).toFixed(1) + " mpg";
  }
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

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  // form state
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

  // Auto-select first car once loaded
  React.useEffect(() => {
    if (cars.length > 0 && selectedCarId === null) {
      setSelectedCarId(cars[0].id);
    }
  }, [cars]);

  const fuelQuery = useQuery<FuelRecord[]>({
    queryKey: ["fuel", selectedCarId],
    queryFn: () => apiGet<FuelRecord[]>(`/cars/${selectedCarId}/fuel`),
    enabled: selectedCarId !== null,
  });

  const records = useMemo(() => {
    return (fuelQuery.data ?? []).slice().sort((a, b) => b.mileage - a.mileage);
  }, [fuelQuery.data]);

  // Stats
  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const sorted = [...records].sort((a, b) => a.mileage - b.mileage);
    let totalConsumptionPairs = 0;
    let consumptionPairCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dist = sorted[i].mileage - sorted[i - 1].mileage;
      if (dist > 0 && sorted[i].fullTank !== false) {
        totalConsumptionPairs += sorted[i].liters / dist * 100;
        consumptionPairCount++;
      }
    }
    const avgL100km = consumptionPairCount > 0 ? totalConsumptionPairs / consumptionPairCount : null;
    const totalCost = records.reduce((s, r) => s + r.totalCost, 0);
    const totalLiters = records.reduce((s, r) => s + r.liters, 0);
    return { avgL100km, totalCost, totalLiters, count: records.length };
  }, [records]);

  const formatAvg = (avgL100km: number | null) => {
    if (avgL100km === null) return "—";
    if (unit === "km") return avgL100km.toFixed(1) + " L/100km";
    const mpg = L_PER_GAL / (avgL100km / 100) * 0.621371;
    return mpg.toFixed(1) + " mpg";
  };

  // Auto-calculate total cost when liters & price per unit change
  const handleLitersChange = (val: string) => {
    setFLiters(val);
    const l = parseFloat(val);
    const p = parseFloat(fPricePerUnit);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setFTotalCost((l * p).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setFPricePerUnit(val);
    const l = parseFloat(fLiters);
    const p = parseFloat(val);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setFTotalCost((l * p).toFixed(2));
    }
  };

  const resetForm = () => {
    setFDate(new Date().toISOString().split("T")[0]);
    setFMileage("");
    setFLiters("");
    setFPricePerUnit("");
    setFTotalCost("");
    setFFuelType("");
    setFStation("");
    setFFullTank(true);
    setFNotes("");
  };

  const addMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${selectedCarId}/fuel`, {
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
      qc.invalidateQueries({ queryKey: ["fuel", selectedCarId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: number) =>
      apiDelete(`/cars/${selectedCarId}/fuel/${recordId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel", selectedCarId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmId(null);
    },
  });

  const canSubmit =
    fMileage.trim() !== "" &&
    !isNaN(parseInt(fMileage)) &&
    fLiters.trim() !== "" &&
    !isNaN(parseFloat(fLiters)) &&
    fTotalCost.trim() !== "" &&
    !isNaN(parseFloat(fTotalCost));

  // Per-fill-up consumption (needs sorted-ascending list)
  const sortedAsc = useMemo(() => [...records].reverse(), [records]);
  const consumptionMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 1; i < sortedAsc.length; i++) {
      const dist = sortedAsc[i].mileage - sortedAsc[i - 1].mileage;
      if (dist > 0) {
        map.set(sortedAsc[i].id, calcConsumption(sortedAsc[i].liters, dist, unit));
      }
    }
    return map;
  }, [sortedAsc, unit]);

  const selectedCar = cars.find((c) => c.id === selectedCarId);

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="droplet" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Fuel Consumption</Text>
            {selectedCar && (
              <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>
                {carLabel(selectedCar)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Car picker */}
      {cars.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.carPicker, { backgroundColor: C.card, borderBottomColor: C.border }]}
          contentContainerStyle={styles.carPickerContent}
        >
          {cars.map((car) => {
            const active = car.id === selectedCarId;
            return (
              <Pressable
                key={car.id}
                onPress={() => setSelectedCarId(car.id)}
                style={[
                  styles.carChip,
                  { backgroundColor: active ? C.tint : C.backgroundTertiary, borderColor: active ? C.tint : C.border },
                ]}
              >
                <Text style={[styles.carChipText, { color: active ? "#FFFFFF" : C.textSecondary }]}>
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
            <View style={[styles.statCard, { backgroundColor: C.card, shadowColor: C.shadow }]}>
              <Feather name="trending-up" size={16} color="#2563EB" style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: C.text }]}>{formatAvg(stats.avgL100km)}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Avg. Efficiency</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.card, shadowColor: C.shadow }]}>
              <Feather name="droplet" size={16} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: C.text }]}>{stats.count}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Fill-ups</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: C.card, shadowColor: C.shadow }]}>
              <Feather name="dollar-sign" size={16} color="#F59E0B" style={{ marginBottom: 6 }} />
              <Text style={[styles.statValue, { color: C.text }]}>
                {currency.symbol}{stats.totalCost.toFixed(0)}
              </Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total Spent</Text>
            </View>
          </View>
        )}

        {/* Fill-up list */}
        <SectionHeader
          title="Fill-up Log"
          actionLabel="Log Fill-up"
          onAction={() => {
            if (selectedCarId !== null) setShowAdd(true);
          }}
        />

        {carsQuery.isLoading || fuelQuery.isLoading ? (
          <ActivityIndicator color={C.tint} style={{ marginTop: 24 }} />
        ) : selectedCarId === null ? (
          <EmptyState
            icon="truck"
            title="No cars added"
            description="Add a car to your fleet first."
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon="droplet"
            title="No fill-ups logged"
            description="Log your first fill-up to start tracking fuel efficiency."
            actionLabel="Log Fill-up"
            onAction={() => setShowAdd(true)}
          />
        ) : (
          records.map((r) => {
            const effText = consumptionMap.get(r.id);
            return (
              <View key={r.id} style={[styles.card, { backgroundColor: C.card, shadowColor: C.shadow }]}>
                <View style={[styles.cardIconWrap, { backgroundColor: "#DBEAFE" }]}>
                  <Feather name="droplet" size={18} color="#2563EB" />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardTitle, { color: C.text }]}>
                      {r.liters.toFixed(1)} L{r.fuelType ? ` · ${r.fuelType}` : ""}
                    </Text>
                    <Text style={[styles.cardCost, { color: C.text }]}>
                      {currency.symbol}{r.totalCost.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardSub, { color: C.textSecondary }]}>
                      {formatDate(r.date)} · {r.mileage.toLocaleString()} {unit}
                      {r.station ? ` · ${r.station}` : ""}
                    </Text>
                    {effText && (
                      <Text style={[styles.cardEff, { color: "#2563EB" }]}>{effText}</Text>
                    )}
                  </View>
                  {r.fullTank === false && (
                    <Text style={[styles.cardNote, { color: C.textTertiary }]}>Partial fill</Text>
                  )}
                  {r.notes ? (
                    <Text style={[styles.cardNote, { color: C.textTertiary }]}>{r.notes}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setConfirmId(r.id)}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Feather name="trash-2" size={16} color={C.textTertiary} />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Fill-up Sheet */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={[styles.sheet, { backgroundColor: C.backgroundSecondary }]}>
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
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmId !== null}
        title="Delete Fill-up"
        message="This fill-up record will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => confirmId !== null && deleteMutation.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
        destructive
      />
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
  carPicker: { borderBottomWidth: StyleSheet.hairlineWidth },
  carPickerContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  carChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  carChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16, gap: 0 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  cardIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardCost: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, marginRight: 8 },
  cardEff: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardNote: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
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
