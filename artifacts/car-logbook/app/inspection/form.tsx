import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiGet, apiPost } from "@/hooks/useApi";
import { useCar } from "@/hooks/useCar";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  licensePlate?: string | null;
};

type ResultOption = "No findings" | "Repair required";

export default function InspectionFormScreen() {
  const { carId: carIdParam } = useLocalSearchParams<{ carId: string }>();
  const carId = parseInt(carIdParam ?? "0");
  const insets = useSafeAreaInsets();
  const C = useColors();
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [place, setPlace] = useState("");
  const [results, setResults] = useState<ResultOption | "">("");
  const [cost, setCost] = useState("");
  const [nextInspectionDate, setNextInspectionDate] = useState("");

  const carQuery = useCar<Car>(carId);

  const mutation = useMutation({
    mutationFn: () =>
      apiPost(`/cars/${carId}/inspections`, {
        carId,
        date,
        place: place.trim() || undefined,
        results: results.trim() || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        nextInspectionDate: nextInspectionDate.trim() || undefined,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["inspections", carId] });
      qc.invalidateQueries({ queryKey: ["maintenance", "upcoming"] });
      if (results === "Repair required") {
        Alert.alert(
          t("inspection.faultPrompt.title"),
          t("inspection.faultPrompt.message"),
          [
            {
              text: t("inspection.faultPrompt.later"),
              style: "cancel",
              onPress: () => router.replace({ pathname: "/car/[id]", params: { id: String(carId) } }),
            },
            {
              text: t("inspection.faultPrompt.confirm"),
              onPress: () =>
                router.replace({
                  pathname: "/malfunction/log",
                  params: { carId: String(carId), carName: carTitle },
                }),
            },
          ]
        );
        return;
      }
      router.replace({ pathname: "/car/[id]", params: { id: String(carId) } });
    },
  });

  const car = carQuery.data;
  const carTitle = car ? car.nickname ?? `${car.year} ${car.make} ${car.model}` : "";
  const canSubmit = date.trim().length > 0;
  const textAlign = isRTL ? "right" : "left";

  const resultOptions: { value: ResultOption; labelKey: string; color: string; bg: string }[] = [
    { value: "No findings", labelKey: "inspection.results.noFindings", color: "#059669", bg: "#D1FAE5" },
    { value: "Repair required", labelKey: "inspection.results.repairRequired", color: "#DC2626", bg: "#FEE2E2" },
  ];

  return (
    <SwipeBackView style={{ backgroundColor: C.backgroundSecondary }}>
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
            <Feather name="clipboard" size={22} color="#78350F" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign }]}>{t("inspection.titleInspection")}</Text>
            {carTitle ? (
              <Text style={[styles.headerSub, { color: C.textSecondary, textAlign }]} numberOfLines={1}>{carTitle}</Text>
            ) : null}
          </View>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>{t("inspection.section")}</Text>

          <DatePickerField
            label={t("inspection.fields.date")}
            value={date}
            onChange={setDate}
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
                      i === resultOptions.length - 1 && styles.resultBtnLast,
                      i < resultOptions.length - 1 && (isRTL
                        ? { borderLeftWidth: 1, borderLeftColor: C.border }
                        : { borderRightWidth: 1, borderRightColor: C.border }),
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
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <FormField
            label={t("inspection.fields.cost")}
            value={cost}
            onChangeText={setCost}
            placeholder={t("inspection.placeholders.cost")}
            keyboardType="decimal-pad"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <DatePickerField
            label={t("inspection.fields.nextDate")}
            value={nextInspectionDate}
            onChange={setNextInspectionDate}
          />
        </View>

        {mutation.isError && (
          <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
            <Text style={[styles.errorText, { color: C.danger }]}>
              {t("inspection.error")}
            </Text>
          </View>
        )}

        <PrimaryButton
          variant="metallic-blue"
          icon="check"
          label={t("inspection.save")}
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
});
