import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiPost } from "@/hooks/useApi";

export default function ChangePasswordScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const canSubmit =
    current.length > 0 && newPw.length >= 6 && confirm.length >= 6;

  const validate = (): string | null => {
    if (!current) return "Please enter your current password.";
    if (newPw.length < 6) return "New password must be at least 6 characters.";
    if (newPw !== confirm) return "Passwords don't match.";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await apiPost("/auth/change-password", {
        currentPassword: current,
        newPassword: newPw,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => router.back(), 1000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SwipeBackView style={[styles.container, { backgroundColor: C.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 12,
              borderBottomColor: C.border,
              backgroundColor: C.card,
            },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={22} color={C.tint} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]}>Change Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconCircle, { backgroundColor: C.infoLight }]}>
              <Feather name="lock" size={28} color={C.tint} />
            </View>
            <Text style={[styles.iconHint, { color: C.textSecondary }]}>
              Choose a strong password you haven't used before
            </Text>
          </View>

          {/* Fields card */}
          <View style={[styles.card, { backgroundColor: C.card }]}>
            {/* Current Password */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Current Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={current}
                  onChangeText={(t) => { setCurrent(t); setError(""); setSaved(false); }}
                  placeholder="Enter current password"
                  placeholderTextColor={C.textTertiary}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => newRef.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                  <Feather name={showCurrent ? "eye-off" : "eye"} size={18} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

            {/* New Password */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>New Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={newRef}
                  style={[styles.input, { color: C.text }]}
                  value={newPw}
                  onChangeText={(t) => { setNewPw(t); setError(""); setSaved(false); }}
                  placeholder="At least 6 characters"
                  placeholderTextColor={C.textTertiary}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                  <Feather name={showNew ? "eye-off" : "eye"} size={18} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
              {newPw.length > 0 && newPw.length < 6 && (
                <Text style={[styles.inlineHint, { color: C.danger }]}>
                  At least 6 characters required
                </Text>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

            {/* Confirm Password */}
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Confirm New Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, { color: C.text }]}
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); setError(""); setSaved(false); }}
                  placeholder="Re-enter new password"
                  placeholderTextColor={C.textTertiary}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                  <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
              {confirm.length > 0 && newPw !== confirm && (
                <Text style={[styles.inlineHint, { color: C.danger }]}>
                  Passwords don't match
                </Text>
              )}
            </View>
          </View>

          {/* Error */}
          {error !== "" && (
            <View style={[styles.messageBanner, { backgroundColor: C.dangerLight }]}>
              <Feather name="alert-circle" size={15} color={C.danger} />
              <Text style={[styles.messageText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {saved && (
            <View style={[styles.messageBanner, { backgroundColor: "#D1FAE5" }]}>
              <Feather name="check-circle" size={15} color="#059669" />
              <Text style={[styles.messageText, { color: "#059669" }]}>
                Password updated successfully!
              </Text>
            </View>
          )}

          <PrimaryButton
            label={loading ? "Updating…" : "Update Password"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!canSubmit || loading || saved}
          />
        </ScrollView>
      </SwipeBackView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  headerSpacer: { width: 30 },

  scroll: { padding: 20, gap: 16 },

  iconSection: { alignItems: "center", paddingVertical: 8, gap: 10 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  fieldRow: { paddingVertical: 14, gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  inlineHint: { fontSize: 12, fontFamily: "Inter_400Regular" },

  messageBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  messageText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
