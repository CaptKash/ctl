import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiPost } from "@/hooks/useApi";
import { Feather } from "@expo/vector-icons";

export default function AddCarScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [color, setColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/cars", {
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        color: color.trim() || undefined,
        licensePlate: licensePlate.trim() || undefined,
        vin: vin.trim() || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["cars"] });
      router.back();
    },
  });

  const canSubmit = make.trim() && model.trim() && year.trim();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.backgroundSecondary }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="x" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Add Car</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.form,
          { paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Basic Info</Text>
          <FormField label="Make" value={make} onChangeText={setMake} placeholder="e.g. Toyota" required />
          <FormField label="Model" value={model} onChangeText={setModel} placeholder="e.g. Camry" required />
          <FormField label="Year" value={year} onChangeText={setYear} placeholder="e.g. 2022" keyboardType="number-pad" required />
          <FormField label="Color" value={color} onChangeText={setColor} placeholder="e.g. Silver" />
        </View>

        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Details</Text>
          <FormField label="License Plate" value={licensePlate} onChangeText={setLicensePlate} placeholder="e.g. ABC 1234" />
          <FormField label="VIN" value={vin} onChangeText={setVin} placeholder="Vehicle Identification Number" />
          <FormField label="Current Mileage (km)" value={mileage} onChangeText={setMileage} placeholder="e.g. 45000" keyboardType="number-pad" />
        </View>

        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Notes</Text>
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Any additional notes..." multiline />
        </View>

        <PrimaryButton
          label="Add to Logbook"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  form: {
    padding: 20,
    gap: 16,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
});
