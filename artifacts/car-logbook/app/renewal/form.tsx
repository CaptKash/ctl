import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useOrg } from "@/context/OrgContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiGet, apiPost, apiPut } from "@/hooks/useApi";
import { useCar } from "@/hooks/useCar";

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
  const { activeRole, isOrgContext } = useOrg();
  const isClientRole = isOrgContext && activeRole === "client";
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = useColors();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const textAlign = isRTL ? "right" : "left";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [renewalType, setRenewalType] = useState<RenewalType>("license");
  const [validUntil, setValidUntil] = useState("");
  const [provider, setProvider] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const { data: car } = useCar<Car>(carId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!car) throw new Error("Car not found");

      const parsedCost = cost.trim() ? Number(cost.replace(/,/g, "")) : null;
      const today = new Date().toISOString().split("T")[0];
      await apiPost(`/cars/${carId}/renewals`, {
        type: renewalType,
        date: today,
        validUntil: validUntil || null,
        provider: provider.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        cost: parsedCost != null && !Number.isNaN(parsedCost) ? parsedCost : null,
        notes: notes.trim() || null,
      });

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
      qc.invalidateQueries({ queryKey: ["report", carId] });
      qc.invalidateQueries({ queryKey: ["maintenance", "upcoming"] });
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const carTitle = car ? `${car.year} ${car.make} ${car.model}` : "";

  const canSubmit = validUntil.trim().length > 0;

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#CCFBF1", "#5EEAD4", "#0D9488"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#115E59" }]}
          >
            <Feather name="refresh-cw" size={22} color="#134E4A" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign }]}>{t("renewal.formTitle")}</Text>
            {carTitle ? (
              <Text style={[styles.headerSub, { color: C.textSecondary, textAlign }]} numberOfLines={1}>
                {carTitle}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type pills */}
        {!isClientRole && (
        <View style={[styles.pillRow, isRTL && { flexDirection: "row-reverse" }]}>
          {(["license", "insurance"] as RenewalType[]).map((rt) => {
            const active = renewalType === rt;
            const icon = rt === "license" ? "credit-card" : "shield";
            const label = t(`renewal.types.${rt}`);
            const gradientColors = active
              ? (["#CCFBF1", "#5EEAD4", "#0D9488"] as const)
              : (["#F8FAFC", "#E2E8F0", "#CBD5E1"] as const);
            const border = active ? "#115E59" : "#94A3B8";
            const fg = active ? "#134E4A" : "#475569";
            return (
              <Pressable
                key={rt}
                onPress={() => { Haptics.selectionAsync(); setRenewalType(rt); mutation.reset(); }}
                style={({ pressed }) => [styles.pillWrap, { opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient
                  colors={gradientColors}
                  locations={[0, 0.55, 1]}
                  start={{ x: 0.15, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={[
                    styles.pill,
                    isRTL && { flexDirection: "row-reverse" },
                    { borderColor: border },
                  ]}
                >
                  <Feather name={icon} size={16} color={fg} />
                  <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
        )}

        {/* Renewal Details */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>
            {t("renewal.detailsSection")}
          </Text>

          <DatePickerField
            label={renewalType === "license" ? t("renewal.fields.licenseValidUntil") : t("renewal.fields.insuranceValidUntil")}
            value={validUntil}
            onChange={setValidUntil}
            placeholder={t("renewal.placeholders.expiryDate")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={renewalType === "license" ? t("renewal.fields.issuingAuthority") : t("renewal.fields.insuranceProvider")}
            value={provider}
            onChangeText={setProvider}
            placeholder={renewalType === "license" ? t("renewal.placeholders.authority") : t("renewal.placeholders.provider")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={renewalType === "license" ? t("renewal.fields.referenceNumber") : t("renewal.fields.policyNumber")}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            placeholder={t("renewal.placeholders.optional")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={t("renewal.fields.cost")}
            value={cost}
            onChangeText={setCost}
            placeholder={t("renewal.placeholders.cost")}
            keyboardType="decimal-pad"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

          <FormField
            label={t("renewal.fields.notes")}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("renewal.placeholders.notes")}
            multiline
          />
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              {t("renewal.errorSave")}
            </Text>
          </View>
        )}

        <PrimaryButton
          variant="metallic-blue"
          icon="check"
          label={renewalType === "license" ? t("renewal.saveLicense") : t("renewal.saveInsurance")}
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit || !car}
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
  pillWrap: { flex: 1, borderRadius: 12 },
  pill: {
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
  errorBox: { borderRadius: 10, padding: 14 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
