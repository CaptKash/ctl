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
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiGet, apiPost } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
};

export default function InspectionFormScreen() {
  const { carId: carIdParam } = useLocalSearchParams<{ carId: string }>();
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [place, setPlace] = useState("");
  const [results, setResults] = useState("");
  const [cost, setCost] = useState("");
  const [requiredRepairs, setRequiredRepairs] = useState("");
  const [nextInspectionDate, setNextInspectionDate] = useState("");

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/inspections`, {
        carId,
        date,
        place: place.trim() || undefined,
        results: results.trim() || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        requiredRepairs: requiredRepairs.trim() || undefined,
        nextInspectionDate: nextInspectionDate.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["inspections", carId] });
      qc.invalidateQueries({ queryKey: ["maintenance", "upcoming"] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const car = carQuery.data;
  const carTitle = car ? car.nickname ?? `${car.year} ${car.make} ${car.model}` : "Car";
  const canSubmit = date.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: C.backgroundSecondary }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="check-square" size={22} color="#D97706" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Add Inspection</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>{carTitle}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Inspection Details</Text>

          <DatePickerField
            label="Date"
            value={date}
            onChange={setDate}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Place"
            value={place}
            onChangeText={setPlace}
            placeholder="e.g. City Inspection Centre"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Results"
            value={results}
            onChangeText={setResults}
            placeholder="e.g. Passed, Failed, Conditional pass…"
            multiline
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Cost"
            value={cost}
            onChangeText={setCost}
            placeholder="e.g. 75.00"
            keyboardType="decimal-pad"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Required Repairs"
            value={requiredRepairs}
            onChangeText={setRequiredRepairs}
            placeholder="List any repairs flagged during inspection…"
            multiline
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <DatePickerField
            label="Next Inspection Date"
            value={nextInspectionDate}
            onChange={setNextInspectionDate}
          />
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              Failed to save. Please check required fields and try again.
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Save Inspection"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>
      <BottomNav />
    </View>
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
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -4 },
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
