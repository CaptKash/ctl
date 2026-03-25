import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon } from "react-native-svg";
import { useColors, useTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiPost } from "@/hooks/useApi";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { width: screenW } = useWindowDimensions();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const canSubmit = email.trim().length > 3 && email.includes("@");

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email: email.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
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
      <View style={[styles.container, { backgroundColor: C.background }]}>

        {/* Hero */}
        <View style={[
          styles.hero,
          { paddingTop: topPad + 28 },
          isDark
            ? { backgroundColor: "#0F2D5E" }
            : {
                backgroundColor: "#FFFFFF",
                borderBottomWidth: 2,
                borderBottomColor: "#B8CADD",
                shadowColor: "#1D4ED8",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              },
        ]}>
          <Svg
            width={screenW}
            height={250}
            style={{ position: "absolute", top: 0, left: 0 }}
            pointerEvents="none"
          >
            <Polygon
              points={`${Math.round(screenW * 0.57)},0 ${screenW},0 ${screenW},250 ${Math.round(screenW * 0.57)},155`}
              fill={isDark ? "#071A40" : "#DBEAFE"}
            />
          </Svg>

          <Text style={[styles.heroTitle, { color: isDark ? "#FFFFFF" : "#0F2D5E" }]}>CTL</Text>
          <View style={styles.heroLines}>
            <View style={styles.heroLineLong} />
            <View style={styles.heroLineShort} />
          </View>
          <Text style={[styles.heroTagline, { color: isDark ? "#93C5FD" : "#2563EB" }]}>
            Car Technical Log
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {sent ? (
            /* ── Success state ─────────────────────────────────────────── */
            <View style={[styles.formCard, { backgroundColor: C.card }]}>
              <View style={styles.successBlock}>
                <View style={[styles.successIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Feather name="mail" size={28} color="#059669" />
                </View>
                <Text style={[styles.successTitle, { color: C.text }]}>Check your email</Text>
                <Text style={[styles.successSub, { color: C.textSecondary }]}>
                  If an account exists for <Text style={{ fontFamily: "Inter_600SemiBold", color: C.text }}>{email.trim()}</Text>, a password reset link has been sent. Check your inbox (and spam folder).
                </Text>
                <Text style={[styles.successNote, { color: C.textSecondary }]}>
                  The link expires in 1 hour.
                </Text>
              </View>

              <PrimaryButton
                label="Back to Sign In"
                onPress={() => router.back()}
              />
            </View>
          ) : (
            /* ── Email form ────────────────────────────────────────────── */
            <View style={[styles.formCard, { backgroundColor: C.card }]}>
              <View style={styles.welcomeBlock}>
                <Text style={[styles.welcomeTitle, { color: C.text }]}>Reset password</Text>
                <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
                  Enter your account email and we'll send you a reset link.
                </Text>
              </View>

              {error !== "" && (
                <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                  <Feather name="alert-circle" size={15} color={C.danger} />
                  <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
                </View>
              )}

              <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Email</Text>
                <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                  <Feather name="mail" size={16} color={C.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: C.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={C.textTertiary}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                    autoFocus
                  />
                </View>
              </View>

              <PrimaryButton
                label="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                disabled={!canSubmit || loading}
              />

              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={styles.backLink}
              >
                <Feather name="arrow-left" size={14} color={C.tint} />
                <Text style={[styles.backLinkText, { color: C.tint }]}>Back to Sign In</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    backgroundColor: "#0F2D5E",
    paddingHorizontal: 28,
    paddingBottom: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 72,
    fontFamily: "Inter_700Bold",
    lineHeight: 76,
    color: "#FFFFFF",
  },
  heroLines: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  heroLineLong: {
    height: 5,
    width: 90,
    backgroundColor: "#1D4ED8",
    borderRadius: 3,
  },
  heroLineShort: {
    height: 5,
    width: 38,
    backgroundColor: "#0891B2",
    borderRadius: 3,
  },
  heroTagline: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 10,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  welcomeBlock: { gap: 6 },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  welcomeSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  sep: { height: StyleSheet.hairlineWidth },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  successBlock: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  successSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  successNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
