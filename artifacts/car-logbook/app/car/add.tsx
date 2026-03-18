import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { DatePickerField } from "@/components/ui/DatePickerField";
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

  // Electric
  const [isElectric, setIsElectric] = useState(false);

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
        isElectric,
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
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="plus-circle" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Add Car</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>New vehicle</Text>
          </View>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
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

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={[styles.evBadge, { backgroundColor: isElectric ? "#D1FAE5" : C.backgroundTertiary }]}>
                <Text style={{ fontSize: 16 }}>⚡</Text>
              </View>
              <View>
                <Text style={[styles.toggleLabel, { color: C.text }]}>Electric Vehicle</Text>
                <Text style={[styles.toggleSub, { color: C.textSecondary }]}>
                  {isElectric ? "EV — no fuel records" : "Combustion or hybrid"}
                </Text>
              </View>
            </View>
            <Switch
              value={isElectric}
              onValueChange={setIsElectric}
              trackColor={{ false: C.border, true: "#34D399" }}
              thumbColor={isElectric ? "#059669" : "#fff"}
            />
          </View>
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

          <DatePickerField
            label="Valid Until"
            value={licenseValidUntil}
            onChange={setLicenseValidUntil}
            placeholder="Select expiry date…"
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

          <DatePickerField
            label="Insured Until"
            value={insuredUntil}
            onChange={setInsuredUntil}
            placeholder="Select expiry date…"
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
      </KeyboardAwareScrollViewCompat>
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
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  headerTitle: {
    fontSize: 22,
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  evBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  toggleSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
