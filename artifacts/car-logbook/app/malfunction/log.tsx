import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiPost } from "@/hooks/useApi";
import { DashboardIcon, DASHBOARD_LIGHTS } from "@/components/ui/DashboardLightIcons";


export default function MalfunctionLogScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId, carName } = useLocalSearchParams<{ carId: string; carName: string }>();

  const [description, setDescription] = useState("");
  const [selectedLights, setSelectedLights] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = description.trim().length > 0 || customMessage.trim().length > 0 || selectedLights.size > 0;

  const toggleLight = (light: string) => {
    Haptics.selectionAsync();
    setSelectedLights((prev) => {
      const next = new Set(prev);
      next.has(light) ? next.delete(light) : next.add(light);
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave || !carId) return;
    setSaving(true);
    const selectedIds = DASHBOARD_LIGHTS
      .filter((l) => selectedLights.has(l.id))
      .map((l) => l.id);
    const dashboardMessage = selectedIds.length > 0 ? selectedIds.join(",") : null;
    const finalDescription = description.trim() ||
      selectedIds.map((id) => DASHBOARD_LIGHTS.find((l) => l.id === id)?.label).filter(Boolean).join(", ") ||
      customMessage.trim();
    try {
      await apiPost(`/cars/${carId}/malfunctions`, {
        date: new Date().toISOString().split("T")[0],
        inputMethod: "written",
        description: finalDescription,
        warningMessage: customMessage.trim() || null,
        dashboardMessage,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("malfunction.error");
      Alert.alert(t("common.error", { defaultValue: "Error" }), msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const textAlign = isRTL ? "right" : "left";

  return (
    <SwipeBackView>
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
          <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
              <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
            </Pressable>
            <LinearGradient
              colors={["#FEE2E2", "#FCA5A5", "#DC2626"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[styles.iconBox, { borderWidth: 1, borderColor: "#991B1B" }]}
            >
              <Feather name="alert-triangle" size={22} color="#7F1D1D" />
            </LinearGradient>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: C.text, textAlign }]}>{t("malfunction.title")}</Text>
              {carName ? <Text style={[styles.headerSub, { color: C.textSecondary, textAlign }]} numberOfLines={1}>{carName}</Text> : null}
            </View>
          </View>
        </View>

        {carName && (
          <View style={[styles.carBanner, { backgroundColor: "#FEE2E2" }, isRTL && { flexDirection: "row-reverse" }]}>
            <Feather name="alert-triangle" size={15} color="#DC2626" />
            <Text style={[styles.carBannerText, { color: "#DC2626", textAlign }]} numberOfLines={1}>
              {carName}
            </Text>
          </View>
        )}

        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[
            styles.form,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign }]}>{t("malfunction.sectionDescribe")}</Text>
          <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              style={[styles.textArea, { color: C.text, textAlign }]}
              placeholder={t("malfunction.placeholderDescribe")}
              placeholderTextColor={C.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 10, textAlign }]}>{t("malfunction.sectionDashMsg")}</Text>
          <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border, minHeight: 0 }]}>
            <TextInput
              style={[styles.singleInput, { color: C.text, textAlign }]}
              placeholder={t("malfunction.placeholderDashMsg")}
              placeholderTextColor={C.textTertiary}
              value={customMessage}
              onChangeText={setCustomMessage}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 10, textAlign }]}>{t("malfunction.sectionLights")}</Text>
          <Text style={[styles.sectionHint, { color: C.textTertiary, textAlign }]}>{t("malfunction.hintTapLights")}</Text>
          <View style={styles.lightGridBg}>
          {(() => {
            const sorted = [
              ...DASHBOARD_LIGHTS.filter((l) => l.warningColor === "#FF1744"),
              ...DASHBOARD_LIGHTS.filter((l) => l.warningColor !== "#FF1744"),
            ];
            const rows = [sorted.slice(0, 6), sorted.slice(6)];
            return rows.map((row, rowIdx) => (
              <View key={rowIdx} style={[styles.lightGrid, rowIdx === 0 && { marginBottom: 12 }]}>
                {row.map((light) => {
                  const selected = selectedLights.has(light.id);
                  return (
                    <Pressable
                      key={light.id}
                      onPress={() => toggleLight(light.id)}
                      style={({ pressed }) => [{
                        opacity: pressed ? 0.5 : selected ? 1 : 0.75,
                        borderRadius: 30,
                        borderWidth: selected ? 2 : 0,
                        borderColor: "#D1D5DB",
                        padding: selected ? 3 : 5,
                      }]}
                    >
                      <DashboardIcon id={light.id} color={light.warningColor} size={42} />
                    </Pressable>
                  );
                })}
              </View>
            ));
          })()}
          </View>

          <View style={{ marginTop: 20 }}>
            <PrimaryButton
              variant="metallic-blue"
              icon="check"
              label={saving ? t("malfunction.saving") : t("malfunction.save")}
              onPress={handleSave}
              disabled={!canSave}
              loading={saving}
            />
          </View>
        </KeyboardAwareScrollViewCompat>
        <BottomNav />
      </View>
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

  carBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
  },
  carBannerText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  form: { padding: 20, gap: 10 },

  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    marginTop: -6,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
  },
  textArea: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 90,
  },
  singleInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 0,
  },

  lightGridBg: {
    backgroundColor: "#4B5563",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
  },

  lightGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
