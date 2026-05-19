import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/context/ThemeContext";
import { useCurrency } from "@/context/CurrencyContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
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

type Mode = "repair" | "inspection";
type ResultOption = "Pass" | "Marginal" | "Fail";

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

export default function RepairServiceFormScreen() {
  const { carId: carIdParam } = useLocalSearchParams<{ carId: string }>();
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { currency } = useCurrency();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const textAlign = isRTL ? "right" : "left";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [mode, setMode] = useState<Mode>("repair");

  // Repair state
  const [type, setType] = useState("");
  const [repairDate, setRepairDate] = useState(new Date().toISOString().split("T")[0]);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [warrantyPeriod, setWarrantyPeriod] = useState("");
  const [warrantyDetails, setWarrantyDetails] = useState("");
  const [costOfParts, setCostOfParts] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [billPhotos, setBillPhotos] = useState<string[]>([]);
  const [warrantyPhotos, setWarrantyPhotos] = useState<string[]>([]);
  const [repairNextInspectionDate, setRepairNextInspectionDate] = useState("");

  const totalCost = (parseFloat(costOfParts) || 0) + (parseFloat(laborCost) || 0);

  // Inspection state
  const [inspDate, setInspDate] = useState(new Date().toISOString().split("T")[0]);
  const [place, setPlace] = useState("");
  const [results, setResults] = useState<ResultOption | "">("");
  const [inspCost, setInspCost] = useState("");
  const [inspNextDate, setInspNextDate] = useState("");

  const carQuery = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
    enabled: Boolean(carId),
  });
  const car = carQuery.data;
  const carTitle = car ? `${car.year} ${car.make} ${car.model}` : "";

  // Photo pickers (repair only)
  const pickPhoto = async (target: "bill" | "warranty", useCamera: boolean) => {
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
      if (target === "bill") setBillPhotos([uri]);
      else setWarrantyPhotos([uri]);
    }
  };

  const showPhotoPicker = (target: "bill" | "warranty") => {
    const titleKey = target === "bill" ? "carDetail.photo.billPhoto" : "carDetail.photo.warrantyPhoto";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [t("photoPicker.cancel"), t("photoPicker.takePhoto"), t("photoPicker.chooseFromLibrary")], cancelButtonIndex: 0 },
        (i) => { if (i === 1) pickPhoto(target, true); if (i === 2) pickPhoto(target, false); }
      );
    } else {
      Alert.alert(t(titleKey), t("photoPicker.chooseSource"), [
        { text: t("photoPicker.cancel"), style: "cancel" },
        { text: t("photoPicker.takePhoto"), onPress: () => pickPhoto(target, true) },
        { text: t("photoPicker.chooseFromLibrary"), onPress: () => pickPhoto(target, false) },
      ]);
    }
  };

  const repairMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/maintenance`, {
        type,
        description: correctiveAction.trim() || type,
        date: repairDate,
        costOfParts: costOfParts ? parseFloat(costOfParts) : undefined,
        laborCost: laborCost ? parseFloat(laborCost) : undefined,
        shop: shopName.trim() || undefined,
        shopAddress: shopAddress.trim() || undefined,
        shopPhone: shopPhone.trim() || undefined,
        warrantyPeriod: warrantyPeriod.trim() || undefined,
        warrantyDetails: warrantyDetails.trim() || undefined,
        cost: totalCost > 0 ? totalCost : undefined,
        billPhoto: billPhotos.length > 0 ? billPhotos[0] : undefined,
        warrantyPhoto: warrantyPhotos.length > 0 ? warrantyPhotos[0] : undefined,
      }),
    onSuccess: async () => {
      if (repairNextInspectionDate.trim()) {
        try {
          await apiPost(`/cars/${carId}/inspections`, {
            carId,
            date: new Date().toISOString().split("T")[0],
            nextInspectionDate: repairNextInspectionDate.trim(),
          });
        } catch (_) {}
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["maintenance", carId] });
      qc.invalidateQueries({ queryKey: ["malfunctions", carId] });
      qc.invalidateQueries({ queryKey: ["events", carId] });
      qc.invalidateQueries({ queryKey: ["malfunctions-all"] });
      qc.invalidateQueries({ queryKey: ["upcoming"] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const inspectionMutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/inspections`, {
        carId,
        date: inspDate,
        place: place.trim() || undefined,
        results: results.trim() || undefined,
        cost: inspCost ? parseFloat(inspCost) : undefined,
        nextInspectionDate: inspNextDate.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["inspections", carId] });
      qc.invalidateQueries({ queryKey: ["maintenance", "upcoming"] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const repairCanSubmit = type.trim().length > 0 && (type !== "Other" || correctiveAction.trim().length > 0);
  const inspectionCanSubmit = inspDate.trim().length > 0;
  const canSubmit = mode === "repair" ? repairCanSubmit : inspectionCanSubmit;
  const mutation = mode === "repair" ? repairMutation : inspectionMutation;
  const mutationError = mutation.isError;

  const headerIcon = mode === "repair" ? "tool" : "clipboard";
  const headerTitle = t("inspection.titleSelect");

  const resultOptions: { value: ResultOption; labelKey: string; color: string; bg: string }[] = [
    { value: "Pass", labelKey: "inspection.results.pass", color: "#059669", bg: "#D1FAE5" },
    { value: "Marginal", labelKey: "inspection.results.marginal", color: "#D97706", bg: "#FEF3C7" },
    { value: "Fail", labelKey: "inspection.results.fail", color: "#DC2626", bg: "#FEE2E2" },
  ];

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#FEF3C7", "#FCD34D", "#D97706"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#92400E" }]}
          >
            <Feather name={headerIcon} size={22} color="#78350F" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign }]}>{headerTitle}</Text>
            {carTitle ? <Text style={[styles.headerSub, { color: C.textSecondary, textAlign }]} numberOfLines={1}>{carTitle}</Text> : null}
          </View>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Mode pills */}
        <View style={[styles.pillRow, isRTL && { flexDirection: "row-reverse" }]}>
          {(["repair", "inspection"] as Mode[]).map((m) => {
            const active = mode === m;
            const icon = m === "repair" ? "tool" : "clipboard";
            const label = t(m === "repair" ? "inspection.options.repair" : "inspection.options.inspection");
            const gradientColors = active
              ? (["#FEF3C7", "#FCD34D", "#D97706"] as const)
              : (["#F8FAFC", "#E2E8F0", "#CBD5E1"] as const);
            const borderColor = active ? "#92400E" : "#94A3B8";
            const fg = active ? "#78350F" : "#475569";
            return (
              <Pressable
                key={m}
                onPress={() => {
                  Haptics.selectionAsync();
                  repairMutation.reset();
                  inspectionMutation.reset();
                  setMode(m);
                }}
                style={({ pressed }) => [styles.pillWrap, { opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient
                  colors={gradientColors}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={[styles.pillBtn, { borderColor }, isRTL && { flexDirection: "row-reverse" }]}
                >
                  <Feather name={icon} size={18} color={fg} />
                  <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {mode === "repair" ? (
          <>
            {/* Service */}
            <View style={[styles.costCard, { backgroundColor: C.card }]}>
              <View style={[styles.costHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costTitle, { color: C.text, textAlign }]}>{t("carDetail.maintenanceForm.sections.service")}</Text>
              </View>
              <View style={styles.serviceFields}>
                <DatePickerField
                  label={t("carDetail.maintenanceForm.fields.date")}
                  value={repairDate}
                  onChange={setRepairDate}
                />
                <SelectField
                  label={t("carDetail.maintenanceForm.fields.type")}
                  value={type}
                  onSelect={setType}
                  options={MAINTENANCE_TYPES}
                  placeholder={t("carDetail.maintenanceForm.placeholders.type")}
                  required
                />
                {type !== "" && (
                  <FormField
                    label={t("carDetail.maintenanceForm.fields.description")}
                    value={correctiveAction}
                    onChangeText={setCorrectiveAction}
                    placeholder={type === "Other" ? t("carDetail.maintenanceForm.placeholders.descOther") : t("carDetail.maintenanceForm.placeholders.descGeneric")}
                    multiline
                    required={type === "Other"}
                  />
                )}
              </View>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

            {/* Warranty */}
            <View style={[styles.costCard, { backgroundColor: C.card }]}>
              <View style={[styles.costHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costTitle, { color: C.text, textAlign }]}>{t("carDetail.maintenanceForm.sections.warranty")}</Text>
              </View>
              <View style={styles.serviceFields}>
                <FormField
                  label={t("carDetail.maintenanceForm.fields.warrantyPeriod")}
                  value={warrantyPeriod}
                  onChangeText={setWarrantyPeriod}
                  placeholder={t("carDetail.maintenanceForm.placeholders.warrantyPeriod")}
                />
                <FormField
                  label={t("carDetail.maintenanceForm.fields.warrantyDetails")}
                  value={warrantyDetails}
                  onChangeText={setWarrantyDetails}
                  placeholder={t("carDetail.maintenanceForm.placeholders.warrantyDetails")}
                  multiline
                />
                {warrantyPhotos.length > 0 ? (
                  <Pressable onPress={() => showPhotoPicker("warranty")} style={[styles.billThumbRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <Image source={{ uri: warrantyPhotos[0] }} style={styles.billThumb} resizeMode="cover" />
                    <Text style={[styles.billThumbLabel, { color: C.textSecondary, textAlign }]}>{t("carDetail.maintenanceForm.tapToReplace")}</Text>
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
                    onPress={() => showPhotoPicker("warranty")}
                    style={({ pressed }) => [
                      styles.warrantyPhotoBtn,
                      isRTL && { flexDirection: "row-reverse" },
                      { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.backgroundSecondary },
                    ]}
                  >
                    <Feather name="camera" size={16} color={C.textSecondary} />
                    <Text style={[styles.billPhotoBtnText, { color: C.textSecondary }]}>{t("carDetail.maintenanceForm.addPhotoWarranty")}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

            {/* Cost */}
            <View style={[styles.costCard, { backgroundColor: C.card }]}>
              <View style={[styles.costHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costTitle, { color: C.text, textAlign }]}>{t("carDetail.maintenanceForm.sections.cost")} ({currency.symbol})</Text>
              </View>
              <View style={[styles.costRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costRowLabel, { color: C.textSecondary, textAlign }]}>{t("carDetail.maintenanceForm.fields.parts")} ({currency.symbol})</Text>
                <TextInput
                  value={costOfParts}
                  onChangeText={setCostOfParts}
                  placeholder={t("carDetail.maintenanceForm.placeholders.amount")}
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  style={[styles.costRowInput, { color: C.text, borderColor: C.border, backgroundColor: C.backgroundTertiary }]}
                />
              </View>
              <View style={[styles.costRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costRowLabel, { color: C.textSecondary, textAlign }]}>{t("carDetail.maintenanceForm.fields.labor")} ({currency.symbol})</Text>
                <TextInput
                  value={laborCost}
                  onChangeText={setLaborCost}
                  placeholder={t("carDetail.maintenanceForm.placeholders.amount")}
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  style={[styles.costRowInput, { color: C.text, borderColor: C.border, backgroundColor: C.backgroundTertiary }]}
                />
              </View>
              <View style={[styles.costRow, { paddingBottom: 10 }, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costRowLabel, { color: C.textSecondary, textAlign }]}>{t("carDetail.maintenanceForm.fields.total")}</Text>
                <View style={[styles.costRowInput, { backgroundColor: C.backgroundTertiary, borderColor: C.border, justifyContent: "center" }]}>
                  <Text style={[styles.totalValue, { color: totalCost > 0 ? C.text : C.textTertiary, textAlign: "right" }]}>
                    {totalCost > 0 ? `${currency.symbol}${totalCost.toFixed(2)}` : "—"}
                  </Text>
                </View>
              </View>
              {billPhotos.length > 0 ? (
                <Pressable onPress={() => showPhotoPicker("bill")} style={[styles.billThumbRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <Image source={{ uri: billPhotos[0] }} style={styles.billThumb} resizeMode="cover" />
                  <Text style={[styles.billThumbLabel, { color: C.textSecondary, textAlign }]}>{t("carDetail.maintenanceForm.tapToReplace")}</Text>
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
                  onPress={() => showPhotoPicker("bill")}
                  style={({ pressed }) => [
                    styles.billPhotoBtn,
                    isRTL && { flexDirection: "row-reverse" },
                    { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.backgroundSecondary },
                  ]}
                >
                  <Feather name="camera" size={16} color={C.textSecondary} />
                  <Text style={[styles.billPhotoBtnText, { color: C.textSecondary }]}>{t("carDetail.maintenanceForm.addPhotoBill")}</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

            {/* Repair Shop */}
            <View style={[styles.costCard, { backgroundColor: C.card }]}>
              <View style={[styles.costHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costTitle, { color: C.text, textAlign }]}>{t("carDetail.maintenanceForm.sections.shop")}</Text>
              </View>
              <View style={styles.serviceFields}>
                <FormField
                  label={t("carDetail.maintenanceForm.fields.shopName")}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder={t("carDetail.maintenanceForm.placeholders.shopName")}
                />
                <FormField
                  label={t("carDetail.maintenanceForm.fields.address")}
                  value={shopAddress}
                  onChangeText={setShopAddress}
                  placeholder={t("carDetail.maintenanceForm.placeholders.address")}
                />
                <FormField
                  label={t("carDetail.maintenanceForm.fields.phone")}
                  value={shopPhone}
                  onChangeText={setShopPhone}
                  placeholder={t("carDetail.maintenanceForm.placeholders.phone")}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: C.border }]} />

            {/* Next Inspection */}
            <View style={[styles.costCard, { backgroundColor: C.card }]}>
              <View style={[styles.costHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.costTitle, { color: C.text, textAlign }]}>{t("carDetail.maintenanceForm.sections.nextInspection")}</Text>
              </View>
              <View style={styles.serviceFields}>
                <DatePickerField
                  label={t("carDetail.maintenanceForm.fields.nextInspectionDate")}
                  value={repairNextInspectionDate}
                  onChange={setRepairNextInspectionDate}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>{t("inspection.section")}</Text>

            <DatePickerField
              label={t("inspection.fields.date")}
              value={inspDate}
              onChange={setInspDate}
            />
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
            <FormField
              label={t("inspection.fields.center")}
              value={place}
              onChangeText={setPlace}
              placeholder={t("inspection.placeholders.center")}
            />
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
            <View style={styles.resultField}>
              <Text style={[styles.resultLabel, { color: C.textSecondary, textAlign }]}>{t("inspection.fields.results")}</Text>
              <View style={[styles.resultBtnRow, { borderColor: C.border }, isRTL && { flexDirection: "row-reverse" }]}>
                {resultOptions.map((option, i) => {
                  const active = results === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => { Haptics.selectionAsync(); setResults(active ? "" : option.value); }}
                      style={[
                        styles.resultBtn,
                        { backgroundColor: active ? option.bg : C.backgroundSecondary },
                        i === 0 && styles.resultBtnFirst,
                        i === 2 && styles.resultBtnLast,
                        i < 2 && { borderRightWidth: 1, borderRightColor: C.border },
                      ]}
                    >
                      <Text style={[styles.resultBtnText, { color: active ? option.color : C.textSecondary, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                        {t(option.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {(results === "Marginal" || results === "Fail") && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/malfunction/log",
                    params: { carId: String(carId), carName: car ? `${car.year} ${car.make} ${car.model}` : "" },
                  });
                }}
                style={({ pressed }) => [
                  styles.logFaultBtn,
                  isRTL && { flexDirection: "row-reverse" },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Feather name="alert-triangle" size={15} color="#DC2626" />
                <Text style={[styles.logFaultText, { textAlign }]}>{t("inspection.logFault")}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={15} color="#DC2626" />
              </Pressable>
            )}
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
            <FormField
              label={t("inspection.fields.cost")}
              value={inspCost}
              onChangeText={setInspCost}
              placeholder={t("inspection.placeholders.cost")}
              keyboardType="decimal-pad"
            />
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
            <DatePickerField
              label={t("inspection.fields.nextDate")}
              value={inspNextDate}
              onChange={setInspNextDate}
            />
          </View>
        )}

        {mutationError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              {t(mode === "repair" ? "carDetail.maintenanceForm.errorSave" : "inspection.error")}
            </Text>
          </View>
        )}

        <PrimaryButton
          variant="metallic-blue"
          icon="check"
          label={t(mode === "repair" ? "carDetail.maintenanceForm.saveBtn" : "inspection.save")}
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
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  form: { padding: 20, gap: 16 },
  pillRow: { flexDirection: "row", gap: 10 },
  pillWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  section: { borderRadius: 16, padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -4 },
  sectionDivider: { height: StyleSheet.hairlineWidth },
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  // Inspection
  resultField: { gap: 8 },
  resultLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  resultBtnRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  resultBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnFirst: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  resultBtnLast: { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  resultBtnText: { fontSize: 14 },
  logFaultBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logFaultText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#DC2626",
  },
  // Repair (maintenance form styles)
  costCard: { borderRadius: 16, overflow: "hidden" },
  costHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  costTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  serviceFields: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  costRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  costRowLabel: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  costRowInput: {
    width: 130,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
  },
  totalValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  billPhotoBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  warrantyPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  billPhotoBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  billThumbRow: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  billThumb: { width: 56, height: 56, borderRadius: 10 },
  billThumbLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  billRemoveBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
