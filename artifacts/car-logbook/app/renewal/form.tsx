import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiGet, apiPut } from "@/hooks/useApi";

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
  isElectric?: boolean;
  notes?: string | null;
  photos?: string | null;
};

type RenewalType = "license" | "insurance";

export default function RenewalFormScreen() {
  const { carId: carIdParam } = useLocalSearchParams<{ carId: string }>();
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [renewalType, setRenewalType] = useState<RenewalType>("license");
  const [validUntil, setValidUntil] = useState("");
  const [provider, setProvider] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const { data: car } = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!car) throw new Error("Car not found");
      const updatePayload: Partial<Car> = {
        make: car.make,
        model: car.model,
        year: car.year,
        nickname: car.nickname ?? undefined,
        color: car.color ?? undefined,
        licensePlate: car.licensePlate ?? undefined,
        licenseValidUntil: car.licenseValidUntil ?? undefined,
        vin: car.vin ?? undefined,
        insuredWith: car.insuredWith ?? undefined,
        insuredUntil: car.insuredUntil ?? undefined,
        mileage: car.mileage ?? undefined,
        isElectric: car.isElectric,
        notes: car.notes ?? undefined,
        photos: car.photos ?? undefined,
      };
      if (renewalType === "license") {
        updatePayload.licenseValidUntil = validUntil || undefined;
      } else {
        updatePayload.insuredUntil = validUntil || undefined;
        if (provider.trim()) updatePayload.insuredWith = provider.trim();
      }
      return apiPut(`/cars/${carId}`, updatePayload);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["maintenance", "upcoming"] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const carTitle = car
    ? car.nickname ?? `${car.year} ${car.make} ${car.model}`
    : "Car";

  const canSubmit = validUntil.trim().length > 0;

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#CCFBF1" }]}>
            <Feather name="refresh-cw" size={22} color="#0D9488" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Log Renewal</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>
              {carTitle}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type selector */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Renewal Type</Text>
          <View style={styles.typeRow}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setRenewalType("license"); }}
              style={[
                styles.typeBtn,
                renewalType === "license"
                  ? { backgroundColor: "#CCFBF1", borderColor: "#0D9488" }
                  : { backgroundColor: C.backgroundSecondary, borderColor: C.border },
              ]}
            >
              <Feather
                name="credit-card"
                size={18}
                color={renewalType === "license" ? "#0D9488" : C.textSecondary}
              />
              <Text style={[
                styles.typeBtnText,
                { color: renewalType === "license" ? "#0D9488" : C.textSecondary },
              ]}>
                License
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setRenewalType("insurance"); }}
              style={[
                styles.typeBtn,
                renewalType === "insurance"
                  ? { backgroundColor: "#CCFBF1", borderColor: "#0D9488" }
                  : { backgroundColor: C.backgroundSecondary, borderColor: C.border },
              ]}
            >
              <Feather
                name="shield"
                size={18}
                color={renewalType === "insurance" ? "#0D9488" : C.textSecondary}
              />
              <Text style={[
                styles.typeBtnText,
                { color: renewalType === "insurance" ? "#0D9488" : C.textSecondary },
              ]}>
                Insurance
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Renewal Details */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Renewal Details</Text>

          <DatePickerField
            label={renewalType === "license" ? "License Valid Until" : "Insurance Valid Until"}
            value={validUntil}
            onChange={setValidUntil}
            placeholder="Select expiry date…"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={renewalType === "license" ? "Issuing Authority" : "Insurance Provider"}
            value={provider}
            onChangeText={setProvider}
            placeholder={renewalType === "license" ? "e.g. City Transport Authority" : "e.g. Allianz, Aviva…"}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={renewalType === "license" ? "Reference / Sticker Number" : "Policy Number"}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            placeholder="Optional"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Cost"
            value={cost}
            onChangeText={setCost}
            placeholder="e.g. 120.00"
            keyboardType="decimal-pad"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes…"
            multiline
          />
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              Failed to save. Please try again.
            </Text>
          </View>
        )}

        <PrimaryButton
          label={renewalType === "license" ? "Save License Renewal" : "Save Insurance Renewal"}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit || !car}
        />
      </ScrollView>
      <BottomNav />
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
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  backBtn: {},
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  form: { padding: 20, gap: 16 },
  section: { borderRadius: 16, padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -4 },
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
