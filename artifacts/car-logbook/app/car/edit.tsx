import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SelectField } from "@/components/ui/SelectField";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { apiGet, apiPut } from "@/hooks/useApi";
import { Feather } from "@expo/vector-icons";
import { ALL_MAKES, getModelsForMake } from "@/constants/carData";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) =>
  String(CURRENT_YEAR - i)
);

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  color?: string | null;
  mileage?: number | null;
  licensePlate?: string | null;
  licenseValidUntil?: string | null;
  vin?: string | null;
  insuredWith?: string | null;
  insuredUntil?: string | null;
  notes?: string | null;
  photos?: string | null;
};

export default function EditCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const carId = parseInt(id ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [ready, setReady] = useState(false);

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

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  useEffect(() => {
    const car = carQuery.data;
    if (car && !ready) {
      setNickname(car.nickname ?? "");
      setMake(car.make);
      setModel(car.model);
      setYear(String(car.year));
      setColor(car.color ?? "");
      setMileage(car.mileage != null ? String(car.mileage) : "");
      setLicensePlate(car.licensePlate ?? "");
      setLicenseValidUntil(car.licenseValidUntil ?? "");
      setVin(car.vin ?? "");
      setInsuredWith(car.insuredWith ?? "");
      setInsuredUntil(car.insuredUntil ?? "");
      setNotes(car.notes ?? "");
      try {
        setPhotos(car.photos ? JSON.parse(car.photos) : []);
      } catch {
        setPhotos([]);
      }
      setReady(true);
    }
  }, [carQuery.data, ready]);

  const models = getModelsForMake(make);

  const handleMakeSelect = (value: string) => {
    setMake(value);
    if (value !== carQuery.data?.make) setModel("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      apiPut(`/cars/${carId}`, {
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
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["maintenance", "upcoming"] });
      router.back();
    },
  });

  const canSubmit = make.trim() && model.trim() && year.trim();

  if (carQuery.isLoading || !ready) {
    return (
      <View style={[styles.centered, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.backgroundSecondary }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="edit-2" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Edit Car</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Update vehicle details</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
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
              Failed to save changes. Please try again.
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Save Changes"
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
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
});
