import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { apiPost } from "@/hooks/useApi";
import { DashboardIcon, DASHBOARD_LIGHTS } from "@/components/ui/DashboardLightIcons";


export default function MalfunctionLogScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId, carName } = useLocalSearchParams<{ carId: string; carName: string }>();

  const [description, setDescription] = useState("");
  const [selectedLights, setSelectedLights] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = description.trim().length > 0;

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
    const selectedLabels = DASHBOARD_LIGHTS
      .filter((l) => selectedLights.has(l.id))
      .map((l) => l.label);
    const parts = [...selectedLabels, customMessage.trim()].filter(Boolean);
    const dashboardMessage = parts.length > 0 ? parts.join(", ") : null;
    try {
      await apiPost(`/cars/${carId}/malfunctions`, {
        date: new Date().toISOString().split("T")[0],
        inputMethod: "written",
        description: description.trim(),
        dashboardMessage,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save fault.";
      Alert.alert("Error", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
              <Feather name="arrow-left" size={22} color={C.text} />
            </Pressable>
            <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="alert-triangle" size={22} color="#DC2626" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: C.text }]}>Log Fault</Text>
              {carName ? <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>{carName}</Text> : null}
            </View>
          </View>
        </View>

        {carName && (
          <View style={[styles.carBanner, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="alert-triangle" size={15} color="#DC2626" />
            <Text style={[styles.carBannerText, { color: "#DC2626" }]} numberOfLines={1}>
              {carName}
            </Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.form,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Describe the Issue</Text>
          <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              style={[styles.textArea, { color: C.text }]}
              placeholder="Describe the fault in your own words..."
              placeholderTextColor={C.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 10 }]}>Dashboard Warning Message</Text>
          <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border, minHeight: 0 }]}>
            <TextInput
              style={[styles.singleInput, { color: C.text }]}
              placeholder="e.g. Engine oil pressure low..."
              placeholderTextColor={C.textTertiary}
              value={customMessage}
              onChangeText={setCustomMessage}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 10 }]}>Dashboard Warning Lights</Text>
          <Text style={[styles.sectionHint, { color: C.textTertiary }]}>Tap any that are active</Text>
          <View style={styles.lightGrid}>
            {DASHBOARD_LIGHTS.map((light) => {
              const selected = selectedLights.has(light.id);
              return (
                <Pressable
                  key={light.id}
                  onPress={() => toggleLight(light.id)}
                  style={({ pressed }) => [{
                    opacity: pressed ? 0.4 : selected ? 1 : 0.5,
                  }]}
                >
                  <DashboardIcon id={light.id} color={light.warningColor} size={42} />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!canSave || saving}
            style={[
              styles.saveBtn,
              {
                backgroundColor: canSave ? "#DC2626" : C.backgroundTertiary,
                opacity: saving ? 0.7 : 1,
              },
            ]}
          >
            {saving ? (
              <Text style={styles.saveBtnText}>Saving...</Text>
            ) : (
              <>
                <Feather name="check" size={18} color={canSave ? "#fff" : C.textTertiary} />
                <Text
                  style={[
                    styles.saveBtnText,
                    { color: canSave ? "#fff" : C.textTertiary },
                  ]}
                >
                  Save Fault
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
        <BottomNav />
      </View>
    </KeyboardAvoidingView>
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

  lightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginBottom: 4,
    paddingVertical: 4,
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
