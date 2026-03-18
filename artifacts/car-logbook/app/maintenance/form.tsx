import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";

import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/SelectField";
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

const MAINTENANCE_TYPES = [
  "AC / Air Conditioning Repair",
  "Air Filter Replacement",
  "Alternator Replacement",
  "Battery Replacement",
  "Belt & Hose Replacement",
  "Bodywork Repair",
  "Brake Fluid Flush",
  "Brake Pad Replacement",
  "Brake Repair",
  "Clutch Repair / Replacement",
  "Coolant Flush",
  "CV Joint Replacement",
  "Diagnosis / Fault Scan",
  "Electrical Fault Repair",
  "Engine Repair / Overhaul",
  "Exhaust Repair / Replacement",
  "Fuel Filter Replacement",
  "Fuel Pump Replacement",
  "Fuel System Service",
  "Gearbox / Transmission Repair",
  "General Service",
  "Headlight Replacement",
  "Ignition System Repair",
  "Oil Change",
  "Power Steering Repair",
  "Radiator Repair / Replacement",
  "Repair",
  "Shock Absorber Replacement",
  "Spark Plug Replacement",
  "Starter Motor Replacement",
  "Steering Rack Repair",
  "Suspension Repair",
  "Thermostat Replacement",
  "Timing Belt / Chain Replacement",
  "Tyre Repair",
  "Tyre Replacement",
  "Tyre Rotation",
  "Water Pump Replacement",
  "Wheel Alignment",
  "Wheel Balancing",
  "Windscreen Repair / Replacement",
  "Other",
];

export default function MaintenanceFormScreen() {
  const { carId: carIdParam, faultDescription, faultId: faultIdParam, preType } = useLocalSearchParams<{ carId: string; faultDescription?: string; faultId?: string; preType?: string }>();
  const faultId = faultIdParam ? parseInt(faultIdParam) : null;
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Service details
  const fromFault = Boolean(faultDescription);
  const [type, setType] = useState(preType ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [correctiveAction, setCorrectiveAction] = useState("");
  // Workshop details
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");

  // Warranty
  const [warrantyPeriod, setWarrantyPeriod] = useState("");
  const [warrantyDetails, setWarrantyDetails] = useState("");

  // Cost
  const [costOfParts, setCostOfParts] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [warrantyPhotos, setWarrantyPhotos] = useState<string[]>([]);

  const totalCost = (parseFloat(costOfParts) || 0) + (parseFloat(laborCost) || 0);

  const pickBillPhoto = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.65, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.65, base64: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setBillPhotos([uri]);
    }
  };

  const showBillPhotoPicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickBillPhoto(true); if (i === 2) pickBillPhoto(false); }
      );
    } else {
      Alert.alert("Bill Photo", "Choose a source", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => pickBillPhoto(true) },
        { text: "Choose from Library", onPress: () => pickBillPhoto(false) },
      ]);
    }
  };

  const pickWarrantyPhoto = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.65, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.65, base64: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setWarrantyPhotos([uri]);
    }
  };

  const showWarrantyPhotoPicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickWarrantyPhoto(true); if (i === 2) pickWarrantyPhoto(false); }
      );
    } else {
      Alert.alert("Warranty Photo", "Choose a source", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: () => pickWarrantyPhoto(true) },
        { text: "Choose from Library", onPress: () => pickWarrantyPhoto(false) },
      ]);
    }
  };

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
        costOfParts: costOfParts ? parseFloat(costOfParts) : undefined,
        laborCost: laborCost ? parseFloat(laborCost) : undefined,
        shop: shopName.trim() || undefined,
        shopAddress: shopAddress.trim() || undefined,
        shopPhone: shopPhone.trim() || undefined,
        warrantyPeriod: warrantyPeriod.trim() || undefined,
        warrantyDetails: warrantyDetails.trim() || undefined,
        cost: totalCost > 0 ? totalCost : undefined,
        billPhoto: billPhotos.length > 0 ? billPhotos[0] : undefined,
      }),
    onSuccess: async () => {
      if (faultId) {
        try {
          await apiPost(`/cars/${carId}/events/complete`, {
            recordType: "malfunction",
            recordId: faultId,
          });
        } catch (_) {}
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["maintenance", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      qc.invalidateQueries({ queryKey: ["malfunctions-all"] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const car = carQuery.data;
  const carTitle = car ? car.nickname ?? `${car.year} ${car.make} ${car.model}` : "Car";
  const canSubmit = fromFault
    ? correctiveAction.trim().length > 0
    : type.trim().length > 0 && (type !== "Other" || correctiveAction.trim().length > 0);

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="tool" size={22} color="#D97706" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>{(fromFault || preType === "Repair") ? "Add Repair Log" : "Add Maintenance Log"}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>{carTitle}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Service */}
        <View style={[styles.costCard, { backgroundColor: C.card }]}>
          <View style={styles.costHeader}>
            <Text style={[styles.costTitle, { color: C.text }]}>Service</Text>
          </View>
          <View style={styles.serviceFields}>
            <DatePickerField
              label="Date"
              value={date}
              onChange={setDate}
            />
            {fromFault ? (
              <FormField
                label="Description of Work Done"
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
                  placeholder="Select a type of service…"
                  required
                />
                {type !== "" && (
                  <FormField
                    label="Description"
                    value={correctiveAction}
                    onChangeText={setCorrectiveAction}
                    placeholder={type === "Other" ? "Describe the service performed…" : "Add any notes or details about this service…"}
                    multiline
                    required={type === "Other"}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

        {/* Warranty */}
        <View style={[styles.costCard, { backgroundColor: C.card }]}>
          <View style={styles.costHeader}>
            <Text style={[styles.costTitle, { color: C.text }]}>Warranty</Text>
          </View>
          <View style={styles.serviceFields}>
            <FormField
              label="Warranty Period"
              value={warrantyPeriod}
              onChangeText={setWarrantyPeriod}
              placeholder="e.g. 6 months / 10,000 km"
            />
            <FormField
              label="Warranty Details"
              value={warrantyDetails}
              onChangeText={setWarrantyDetails}
              placeholder="Any conditions or notes about the warranty…"
              multiline
            />
            {warrantyPhotos.length > 0 ? (
              <Pressable onPress={showWarrantyPhotoPicker} style={styles.billThumbRow}>
                <Image source={{ uri: warrantyPhotos[0] }} style={styles.billThumb} resizeMode="cover" />
                <Text style={[styles.billThumbLabel, { color: C.textSecondary }]}>Tap to replace</Text>
                <Pressable
                  onPress={() => setWarrantyPhotos([])}
                  style={[styles.billRemoveBtn, { backgroundColor: C.danger }]}
                  hitSlop={8}
                >
                  <Feather name="x" size={12} color="#fff" />
                </Pressable>
              </Pressable>
            ) : (
              <Pressable
                onPress={showWarrantyPhotoPicker}
                style={({ pressed }) => [
                  styles.warrantyPhotoBtn,
                  { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.backgroundSecondary },
                ]}
              >
                <Feather name="camera" size={16} color={C.textSecondary} />
                <Text style={[styles.billPhotoBtnText, { color: C.textSecondary }]}>Add Photo of Warranty</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

        {/* Repair Shop */}
        <View style={[styles.costCard, { backgroundColor: C.card }]}>
          <View style={styles.costHeader}>
            <Text style={[styles.costTitle, { color: C.text }]}>Repair Shop</Text>
          </View>
          <View style={styles.serviceFields}>
            <FormField
              label="Shop Name"
              value={shopName}
              onChangeText={setShopName}
              placeholder="e.g. City Auto Service"
            />
            <FormField
              label="Address"
              value={shopAddress}
              onChangeText={setShopAddress}
              placeholder="e.g. 12 Main St, Springfield"
            />
            <FormField
              label="Phone"
              value={shopPhone}
              onChangeText={setShopPhone}
              placeholder="e.g. +1 555 000 1234"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

        {/* Cost */}
        <View style={[styles.costCard, { backgroundColor: C.card }]}>
          <View style={styles.costHeader}>
            <Text style={[styles.costTitle, { color: C.text }]}>Cost</Text>
          </View>
          <View style={styles.costRow}>
            <Text style={[styles.costRowLabel, { color: C.textSecondary }]}>Parts</Text>
            <TextInput
              value={costOfParts}
              onChangeText={setCostOfParts}
              placeholder="0.00"
              placeholderTextColor={C.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.costRowInput, { color: C.text, borderColor: C.border, backgroundColor: C.backgroundTertiary }]}
            />
          </View>
          <View style={styles.costRow}>
            <Text style={[styles.costRowLabel, { color: C.textSecondary }]}>Labor</Text>
            <TextInput
              value={laborCost}
              onChangeText={setLaborCost}
              placeholder="0.00"
              placeholderTextColor={C.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.costRowInput, { color: C.text, borderColor: C.border, backgroundColor: C.backgroundTertiary }]}
            />
          </View>
          <View style={[styles.costRow, { paddingBottom: 10 }]}>
            <Text style={[styles.costRowLabel, { color: C.textSecondary }]}>Total</Text>
            <View style={[styles.costRowInput, { backgroundColor: C.backgroundTertiary, borderColor: C.border, justifyContent: "center" }]}>
              <Text style={[styles.totalValue, { color: totalCost > 0 ? C.text : C.textTertiary, textAlign: "right" }]}>
                {totalCost > 0 ? `$${totalCost.toFixed(2)}` : "—"}
              </Text>
            </View>
          </View>
          {billPhotos.length > 0 ? (
            <Pressable onPress={showBillPhotoPicker} style={styles.billThumbRow}>
              <Image source={{ uri: billPhotos[0] }} style={styles.billThumb} resizeMode="cover" />
              <Text style={[styles.billThumbLabel, { color: C.textSecondary }]}>Tap to replace</Text>
              <Pressable
                onPress={() => setBillPhotos([])}
                style={[styles.billRemoveBtn, { backgroundColor: C.danger }]}
                hitSlop={8}
              >
                <Feather name="x" size={12} color="#fff" />
              </Pressable>
            </Pressable>
          ) : (
            <Pressable
              onPress={showBillPhotoPicker}
              style={({ pressed }) => [
                styles.billPhotoBtn,
                { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.backgroundSecondary },
              ]}
            >
              <Feather name="camera" size={16} color={C.textSecondary} />
              <Text style={[styles.billPhotoBtnText, { color: C.textSecondary }]}>Add Photo of Bill</Text>
            </Pressable>
          )}
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              Failed to save. Please check required fields and try again.
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Save Maintenance Log"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit}
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
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
  },
  costCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  serviceFields: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  costHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 12,
  },
  costRowLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  costRowInput: {
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    width: 120,
  },
  costTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalFieldWrap: {
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  totalBox: {
    borderRadius: 10,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  totalValue: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  photoSection: { gap: 10 },
  photoLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  warrantyPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
  },
  billPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  billPhotoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  billThumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  billThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  billThumbLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  billRemoveBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
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
