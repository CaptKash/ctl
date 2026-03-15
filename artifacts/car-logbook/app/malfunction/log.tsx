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
import { apiPost } from "@/hooks/useApi";

type InputMethod = "warning_message" | "written";
type Phase = "car_running" | "car_started" | "parking" | "during_drive";

const INPUT_METHODS: { key: InputMethod; label: string }[] = [
  { key: "warning_message", label: "Warning Message" },
  { key: "written", label: "Write Description" },
];

const PHASES: { key: Phase; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "car_running", label: "Car Running", icon: "zap" },
  { key: "car_started", label: "Car Started", icon: "power" },
  { key: "parking", label: "Parking", icon: "square" },
  { key: "during_drive", label: "During Drive", icon: "navigation" },
];

export default function MalfunctionLogScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId, carName } = useLocalSearchParams<{ carId: string; carName: string }>();

  const [inputMethod, setInputMethod] = useState<InputMethod>("warning_message");
  const [description, setDescription] = useState("");
  const [odometer, setOdometer] = useState("");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = description.trim().length > 0 && phase !== null;

  const handleSave = async () => {
    if (!canSave || !carId) return;
    setSaving(true);
    try {
      await apiPost(`/cars/${carId}/malfunctions`, {
        date: new Date().toISOString().split("T")[0],
        inputMethod,
        description: description.trim(),
        odometer: odometer.trim() ? parseInt(odometer.trim(), 10) : null,
        phase,
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
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]}>Log Fault</Text>
          <View style={{ width: 36 }} />
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

          <View style={styles.toggleRow}>
            {INPUT_METHODS.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setInputMethod(m.key);
                }}
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: inputMethod === m.key ? C.tint : C.backgroundTertiary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: inputMethod === m.key ? "#fff" : C.textSecondary },
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.inputBox, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              style={[styles.textArea, { color: C.text }]}
              placeholder={
                inputMethod === "warning_message"
                  ? "Paste the warning message here..."
                  : "Describe the fault in your own words..."
              }
              placeholderTextColor={C.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 20 }]}>
            Odometer Reading (optional)
          </Text>
          <View style={[styles.odometerRow, { backgroundColor: C.card, borderColor: C.border }]}>
            <Feather name="activity" size={16} color={C.textSecondary} />
            <TextInput
              style={[styles.odometerInput, { color: C.text }]}
              placeholder="e.g. 85000"
              placeholderTextColor={C.textTertiary}
              value={odometer}
              onChangeText={(text) => setOdometer(text.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
            />
            <Text style={[styles.odometerUnit, { color: C.textTertiary }]}>km</Text>
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 20 }]}>
            When did it happen?
          </Text>
          <View style={styles.phaseGrid}>
            {PHASES.map((p) => {
              const selected = phase === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPhase(p.key);
                  }}
                  style={[
                    styles.phaseCard,
                    {
                      backgroundColor: selected ? C.tint : C.card,
                      borderColor: selected ? C.tint : C.border,
                    },
                  ]}
                >
                  <Feather
                    name={p.icon}
                    size={20}
                    color={selected ? "#fff" : C.textSecondary}
                  />
                  <Text
                    style={[
                      styles.phaseLabel,
                      { color: selected ? "#fff" : C.text },
                    ]}
                  >
                    {p.label}
                  </Text>
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
      </View>
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

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

  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  togglePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  inputBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
  },
  textArea: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 100,
  },

  odometerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  odometerInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  odometerUnit: { fontSize: 14, fontFamily: "Inter_500Medium" },

  phaseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  phaseCard: {
    width: "47%",
    flexGrow: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  phaseLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },

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
