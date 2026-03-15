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
import BottomNav from "@/components/ui/BottomNav";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SelectField } from "@/components/ui/SelectField";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { apiPost } from "@/hooks/useApi";
import { Feather } from "@expo/vector-icons";
import { ALL_MAKES, getModelsForMake } from "@/constants/carData";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) =>
  String(CURRENT_YEAR - i)
);

export default function AddCarScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();

  // Basic Info
  const [nickname, setNickname] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");

  // License
  const [licensePlate, setLicensePlate] = useState("");
  const [licenseValidUntil, setLicenseValidUntil] = useState("");
  const [vin, setVin] = useState("");
  const [insuredWith, setInsuredWith] = useState("");
  const [insuredUntil, setInsuredUntil] = useState("");

  // Photos & Notes
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const models = getModelsForMake(make);

  const handleMakeSelect = (value: string) => {
    setMake(value);
    setModel("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      apiPost("/cars", {
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        nickname: nickname.trim() || undefined,
        color: color.trim() || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        licensePlate: licensePlate.trim() || undefined,
        licenseValidUntil: licenseValidUntil.trim() || undefined,
        vin: vin.trim() || undefined,
        insuredWith: insuredWith.trim() || undefined,
        insuredUntil: insuredUntil.trim() || undefined,
        notes: notes.trim() || undefined,
        photos: photos.length > 0 ? JSON.stringify(photos) : undefined,
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
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
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
        {/* Basic Info */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Basic Info</Text>

          <FormField
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. The Beast, Old Faithful"
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <SelectField
            label="Make"
            value={make}
            onSelect={handleMakeSelect}
            options={ALL_MAKES}
            placeholder="Select make…"
            required
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <SelectField
            label="Model"
            value={model}
            onSelect={setModel}
            options={models}
            placeholder={make ? "Select model…" : "Select a make first"}
            disabled={!make}
            required
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <SelectField
            label="Year"
            value={year}
            onSelect={setYear}
            options={YEARS}
            placeholder="Select year…"
            required
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Color"
            value={color}
            onChangeText={setColor}
            placeholder="e.g. Silver"
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Current Mileage (km)"
            value={mileage}
            onChangeText={setMileage}
            placeholder="e.g. 45000"
            keyboardType="number-pad"
          />
        </View>

        {/* License */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>License</Text>

          <FormField
            label="Plate Number"
            value={licensePlate}
            onChangeText={setLicensePlate}
            placeholder="e.g. ABC 1234"
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Valid Until"
            value={licenseValidUntil}
            onChangeText={setLicenseValidUntil}
            placeholder="YYYY-MM-DD"
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="VIN"
            value={vin}
            onChangeText={setVin}
            placeholder="Vehicle Identification Number"
            autoCapitalize="characters"
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Insured With"
            value={insuredWith}
            onChangeText={setInsuredWith}
            placeholder="e.g. Allianz, AXA"
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label="Insured Until"
            value={insuredUntil}
            onChangeText={setInsuredUntil}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Photos */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Photos</Text>
          <PhotoPicker photos={photos} onChange={setPhotos} max={8} />
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Notes</Text>
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
              Failed to add car. Please try again.
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Add to Logbook"
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -4,
  },
  errorBox: {
    borderRadius: 10,
    padding: 14,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
