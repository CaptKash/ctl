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

type Severity = "critical" | "major" | "minor" | "cosmetic";

const SEVERITIES: {
  key: Severity;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  bg: string;
  color: string;
}[] = [
  { key: "critical", label: "Critical",  icon: "alert-octagon", bg: "#FEE2E2", color: "#DC2626" },
  { key: "major",    label: "Major",     icon: "alert-triangle", bg: "#FEF3C7", color: "#D97706" },
  { key: "minor",    label: "Minor",     icon: "info",           bg: "#DBEAFE", color: "#2563EB" },
  { key: "cosmetic", label: "Cosmetic",  icon: "eye",            bg: "#F3F4F6", color: "#6B7280" },
];

export default function MalfunctionLogScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId, carName } = useLocalSearchParams<{ carId: string; carName: string }>();

  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = description.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || !carId) return;
    setSaving(true);
    try {
      await apiPost(`/cars/${carId}/malfunctions`, {
        date: new Date().toISOString().split("T")[0],
        inputMethod: "written",
        description: description.trim(),
        severity,
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

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 20 }]}>
            Severity <Text style={{ textTransform: "none", letterSpacing: 0, fontSize: 11, fontFamily: "Inter_400Regular", color: C.textTertiary }}>(optional)</Text>
          </Text>
          <View style={styles.severityGrid}>
            {SEVERITIES.map((s) => {
              const selected = severity === s.key;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSeverity(s.key);
                  }}
                  style={[
                    styles.severityCard,
                    {
                      backgroundColor: selected ? s.bg : C.card,
                      borderColor: selected ? s.color : C.border,
                    },
                  ]}
                >
                  <Feather
                    name={s.icon}
                    size={18}
                    color={selected ? s.color : C.textSecondary}
                  />
                  <Text
                    style={[
                      styles.severityLabel,
                      { color: selected ? s.color : C.textSecondary },
                    ]}
                  >
                    {s.label}
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
        <BottomNav />
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

  severityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  severityCard: {
    width: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  severityLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

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
