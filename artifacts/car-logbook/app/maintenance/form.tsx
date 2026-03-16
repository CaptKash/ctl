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
import { SelectField } from "@/components/ui/SelectField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { apiGet, apiPost } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
};

const MAINTENANCE_TYPES = [
  "Oil Change",
  "Tyre Rotation",
  "Tyre Replacement",
  "Brake Service",
  "Battery Replacement",
  "Air Filter",
  "Transmission Service",
  "Coolant Flush",
  "Spark Plugs",
  "Timing Belt",
  "Other",
];

export default function MaintenanceFormScreen() {
  const { carId: carIdParam, faultDescription } = useLocalSearchParams<{ carId: string; faultDescription?: string }>();
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Service details
  const fromFault = Boolean(faultDescription);
  const [type, setType] = useState(fromFault ? "Fault Repair" : "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");

  // Workshop details
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  // Warranty
  const [warrantyPeriod, setWarrantyPeriod] = useState("");
  const [warrantyDetails, setWarrantyDetails] = useState("");

  // Cost & bill
  const [totalCost, setTotalCost] = useState("");
  const [billPhotos, setBillPhotos] = useState<string[]>([]);

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/maintenance`, {
        type,
        description: correctiveAction.trim() || type,
        date,
        correctiveAction: correctiveAction.trim() || undefined,
        partsReplaced: partsReplaced.trim() || undefined,
        shop: shopName.trim() || undefined,
        shopAddress: shopAddress.trim() || undefined,
        shopPhone: shopPhone.trim() || undefined,
        warrantyPeriod: warrantyPeriod.trim() || undefined,
        warrantyDetails: warrantyDetails.trim() || undefined,
        cost: totalCost ? parseFloat(totalCost) : undefined,
        billPhoto: billPhotos.length > 0 ? billPhotos[0] : undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["maintenance", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const car = carQuery.data;
  const carTitle = car ? car.nickname ?? `${car.year} ${car.make} ${car.model}` : "Car";
  const canSubmit = fromFault
    ? correctiveAction.trim().length > 0
    : type.trim().length > 0 && (type !== "Other" || correctiveAction.trim().length > 0);

  return (
    <View style={[styles.container, { backgroundColor: C.backgroundSecondary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Add Maintenance</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>
            {carTitle}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <DatePickerField
            label="Date"
            value={date}
            onChange={setDate}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          {fromFault ? (
            <FormField
              label="Service Description"
              value={correctiveAction}
              onChangeText={setCorrectiveAction}
              placeholder="Describe the repair or service performed…"
              multiline
              required
            />
          ) : (
            <>
              <SelectField
                label="Type"
                value={type}
                onSelect={setType}
                options={MAINTENANCE_TYPES}
                placeholder="Select service type…"
                required
              />
              {type === "Other" && (
                <>
                  <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
                  <FormField
                    label="Description"
                    value={correctiveAction}
                    onChangeText={setCorrectiveAction}
                    placeholder="Describe the service…"
                    multiline
                    required
                  />
                </>
              )}
            </>
          )}
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Corrective Action"
            value={correctiveAction}
            onChangeText={setCorrectiveAction}
            placeholder="Describe what was done…"
            multiline
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Parts Replaced"
            value={partsReplaced}
            onChangeText={setPartsReplaced}
            placeholder="List any parts that were replaced…"
            multiline
          />
        </View>

        {/* Workshop Details */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <FormField
            label="Shop Name"
            value={shopName}
            onChangeText={setShopName}
            placeholder="e.g. City Auto Service"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Address"
            value={shopAddress}
            onChangeText={setShopAddress}
            placeholder="e.g. 12 Main St, Springfield"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Phone"
            value={shopPhone}
            onChangeText={setShopPhone}
            placeholder="e.g. +1 555 000 1234"
            keyboardType="phone-pad"
          />
        </View>

        {/* Warranty */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <FormField
            label="Warranty Period"
            value={warrantyPeriod}
            onChangeText={setWarrantyPeriod}
            placeholder="e.g. 6 months / 10,000 km"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label="Warranty Details"
            value={warrantyDetails}
            onChangeText={setWarrantyDetails}
            placeholder="Any conditions or notes about the warranty…"
            multiline
          />
        </View>

        {/* Cost & Bill */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <FormField
            label="Total Cost"
            value={totalCost}
            onChangeText={setTotalCost}
            placeholder="e.g. 250.00"
            keyboardType="decimal-pad"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <View style={styles.photoSection}>
            <Text style={[styles.photoLabel, { color: C.textSecondary }]}>Bill Photo</Text>
            <PhotoPicker photos={billPhotos} onChange={setBillPhotos} max={1} />
          </View>
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              Failed to save. Please check required fields and try again.
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Save Maintenance Record"
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
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  form: {
    padding: 20,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
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
  photoSection: {
    gap: 10,
  },
  photoLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
