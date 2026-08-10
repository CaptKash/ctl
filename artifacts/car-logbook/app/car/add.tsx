import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useOrg } from "@/context/OrgContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SelectField } from "@/components/ui/SelectField";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { apiPost } from "@/hooks/useApi";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ALL_MAKES, getModelsForMake } from "@/constants/carData";
import { VEHICLE_TYPES, usageUnitForType, vehicleTypeIcon } from "@/lib/vehicleTypes";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) =>
  String(CURRENT_YEAR - i)
);

export default function AddCarScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { unit } = useDistanceUnit();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { activeOrgId } = useOrg();

  // Basic Info
  const [nickname, setNickname] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [tankCapacity, setTankCapacity] = useState("");
  const [tankEdited, setTankEdited] = useState(false);
  const [estimatingTank, setEstimatingTank] = useState(false);

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
  const usageUnit = usageUnitForType(vehicleType);
  const usesHours = usageUnit === "hours";
  const vehicleTypeLabels = VEHICLE_TYPES.reduce((acc, vt) => {
    acc[vt] = t(`vehicleTypes.${vt}`);
    return acc;
  }, {} as Record<string, string>);

  const handleMakeSelect = (value: string) => {
    setMake(value);
    setModel("");
    if (!tankEdited) setTankCapacity("");
  };

  useEffect(() => {
    if (isElectric || tankEdited) return;
    if (!make.trim() || !model.trim() || !year.trim()) return;
    let cancelled = false;
    setEstimatingTank(true);
    apiPost<{ liters: number }>("/cars/estimate-tank-capacity", {
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year),
    })
      .then((r) => {
        if (!cancelled && r?.liters) setTankCapacity(String(r.liters));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEstimatingTank(false);
      });
    return () => {
      cancelled = true;
    };
  }, [make, model, year, isElectric, tankEdited]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        vehicleType,
        usageUnit,
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        nickname: nickname.trim() || undefined,
        color: color.trim() || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        tankCapacity: !isElectric && tankCapacity ? parseFloat(tankCapacity) : undefined,
        licensePlate: licensePlate.trim() || undefined,
        licenseValidUntil: licenseValidUntil.trim() || undefined,
        vin: vin.trim() || undefined,
        insuredWith: insuredWith.trim() || undefined,
        insuredUntil: insuredUntil.trim() || undefined,
        isElectric,
        notes: notes.trim() || undefined,
        photos: photos.length > 0 ? JSON.stringify(photos) : undefined,
      };
      return activeOrgId ? apiPost(`/orgs/${activeOrgId}/cars`, payload) : apiPost("/cars", payload);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: activeOrgId ? ["orgs", activeOrgId, "cars"] : ["cars"] });
      router.back();
    },
  });

  const canSubmit = make.trim() && model.trim() && year.trim();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#FFFFFF", "#E2E8F0", "#94A3B8"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, styles.iconBoxMetallic]}
          >
            <MaterialCommunityIcons name={vehicleTypeIcon(vehicleType)} size={24} color="#334155" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{activeOrgId ? t("addCar.titleVehicle") : t("addCar.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.subtitle")}</Text>
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
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.sections.basic")}</Text>

          <SelectField
            label={t("addCar.fields.vehicleType")}
            value={vehicleType}
            onSelect={setVehicleType}
            options={VEHICLE_TYPES}
            optionLabels={vehicleTypeLabels}
            required
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={activeOrgId ? t("addCar.fields.identifier") : t("addCar.fields.nickname")}
            value={nickname}
            onChangeText={setNickname}
            placeholder={activeOrgId ? t("addCar.fields.identifierPlaceholder") : t("addCar.fields.nicknamePlaceholder")}
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <SelectField
            label={t("addCar.fields.make")}
            value={make}
            onSelect={handleMakeSelect}
            options={ALL_MAKES}
            placeholder={t("addCar.fields.makePlaceholder")}
            required
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <SelectField
            label={t("addCar.fields.model")}
            value={model}
            onSelect={setModel}
            options={models}
            placeholder={make ? t("addCar.fields.modelPlaceholder") : t("addCar.fields.modelDisabledPlaceholder")}
            disabled={!make}
            required
            allowCustom
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <View style={[
            styles.toggleRow,
            styles.toggleRowActive,
            isRTL && { flexDirection: "row-reverse" },
          ]}>
            <View style={[styles.toggleLeft, isRTL && { flexDirection: "row-reverse" }]}>
              <LinearGradient
                colors={["#ECFDF5", "#34D399", "#047857"]}
                locations={[0, 0.55, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[styles.evBadge, styles.evBadgeMetallic]}
              >
                <Feather name="zap" size={18} color="#064E3B" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.ev.label")}</Text>
                <Text style={[styles.toggleSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {isElectric ? t("addCar.ev.subOn") : t("addCar.ev.subOff")}
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

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <SelectField
            label={t("addCar.fields.year")}
            value={year}
            onSelect={setYear}
            options={YEARS}
            placeholder={t("addCar.fields.yearPlaceholder")}
            required
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={t("addCar.fields.color")}
            value={color}
            onChangeText={setColor}
            placeholder={t("addCar.fields.colorPlaceholder")}
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={usesHours ? t("addCar.fields.engineHours") : t("addCar.fields.mileage", { unit })}
            value={mileage}
            onChangeText={setMileage}
            placeholder={usesHours ? t("addCar.fields.engineHoursPlaceholder") : t("addCar.fields.mileagePlaceholder")}
            keyboardType="number-pad"
          />

          {!isElectric && (
            <>
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <FormField
                label={t("addCar.fields.tankCapacity")}
                value={tankCapacity}
                onChangeText={(v) => { setTankEdited(true); setTankCapacity(v); }}
                placeholder={estimatingTank ? t("addCar.fields.tankCapacityEstimating") : t("addCar.fields.tankCapacityPlaceholder")}
                keyboardType="decimal-pad"
              />
              {!estimatingTank && !tankEdited && tankCapacity !== "" && (
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 8, marginHorizontal: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: C.tint, borderRadius: 8, backgroundColor: C.tint + "14" }}>
                  <Feather name="zap" size={13} color={C.tint} />
                  <Text style={{ color: C.tint, fontSize: 12, flex: 1, textAlign: isRTL ? "right" : "left" }}>
                    {t("addCar.fields.tankCapacityEstimated")}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={t("addCar.fields.plate")}
            value={licensePlate}
            onChangeText={setLicensePlate}
            placeholder={t("addCar.fields.platePlaceholder")}
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={t("addCar.fields.vin")}
            value={vin}
            onChangeText={setVin}
            placeholder={t("addCar.fields.vinPlaceholder")}
            autoCapitalize="characters"
          />
        </View>

        {/* License */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.sections.license")}</Text>

          <DatePickerField
            label={t("addCar.fields.validUntil")}
            value={licenseValidUntil}
            onChange={setLicenseValidUntil}
            placeholder={t("addCar.fields.expiryPlaceholder")}
          />
        </View>

        {/* Insurance */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.sections.insurance")}</Text>

          <FormField
            label={t("addCar.fields.insuredWith")}
            value={insuredWith}
            onChangeText={setInsuredWith}
            placeholder={t("addCar.fields.insuredWithPlaceholder")}
          />

          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <DatePickerField
            label={t("addCar.fields.insuredUntil")}
            value={insuredUntil}
            onChange={setInsuredUntil}
            placeholder={t("addCar.fields.expiryPlaceholder")}
          />
        </View>

        {/* Photos */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.sections.photos")}</Text>
          <PhotoPicker photos={photos} onChange={setPhotos} max={8} />
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("addCar.sections.notes")}</Text>
          <FormField
            label={t("addCar.fields.notesLabel")}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("addCar.fields.notesPlaceholder")}
            multiline
          />
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              {t("addCar.error")}
            </Text>
          </View>
        )}

        <PrimaryButton
          label={t("addCar.submit")}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit}
          variant="metallic-blue"
          icon="plus"
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
  iconBoxMetallic: {
    borderWidth: 1,
    borderColor: "#64748B",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
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
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
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
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  toggleRowActive: {
    borderColor: "#34D399",
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
  evBadgeMetallic: {
    borderWidth: 1,
    borderColor: "#047857",
    shadowColor: "#064E3B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
