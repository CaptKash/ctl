import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
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
import { useSignIn, isClerkAPIResponseError } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useColors, useTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { apiPost } from "@/hooks/useApi";

type Step = "email" | "verify" | "linkSent";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { width: screenW } = useWindowDimensions();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const rtlText = isRTL ? { textAlign: "right" as const, writingDirection: "rtl" as const } : null;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = [
    { key: "len", label: t("forgotPassword.ruleLen"), met: newPassword.length >= 8 },
    { key: "upper", label: t("forgotPassword.ruleUpper"), met: /[A-Z]/.test(newPassword) },
    { key: "num", label: t("forgotPassword.ruleNum"), met: /[0-9]/.test(newPassword) },
  ];
  const passwordValid = passwordRules.every((r) => r.met);

  // Lightweight RFC-ish email check — keeps obvious typos from hitting
  // Clerk and getting a generic failure back. Clerk does the real
  // validation server-side.
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmitEmail = emailLooksValid && signInLoaded;
  const canSubmitVerify = code.trim().length >= 4 && passwordValid;

  // Step 1: ask Clerk to email a reset code. If Clerk doesn't know this
  // identifier (legacy user not yet migrated), silently fall back to the
  // legacy /auth/forgot-password endpoint which emails a reset link. The
  // user-visible result is generic in both cases — we never reveal which
  // path was taken or whether the account exists.
  const handleSubmitEmail = async () => {
    if (!canSubmitEmail || !signIn) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      try {
        await signIn.create({
          strategy: "reset_password_email_code",
          identifier: email.trim(),
        });
        setStep("verify");
        setCode("");
        setNewPassword("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      } catch (clerkErr: unknown) {
        // Only fall back to legacy if Clerk specifically does not know the
        // identifier. Any other failure is a real error worth surfacing.
        // Scan all error entries (not just the first) defensively — Clerk
        // can return multiple errors and the identifier-not-found one
        // isn't guaranteed to be at index 0.
        const isUnknownIdentifier =
          isClerkAPIResponseError(clerkErr) &&
          clerkErr.errors.some((e) => e.code === "form_identifier_not_found");
        if (isUnknownIdentifier) {
          // Legacy fallback: server endpoint silently no-ops on unknown
          // emails too, so this is safe to call regardless.
          try {
            await apiPost("/auth/forgot-password", { email: email.trim() });
          } catch (legacyErr: unknown) {
            // Rate-limit (429): the server returns a clear message — surface
            // it so the user knows to wait rather than seeing a false
            // "check your email" screen. All other errors (shouldn't happen
            // on the happy path since the server returns 200 for unknown
            // emails) fall through to linkSent to preserve original behaviour.
            const msg = legacyErr instanceof Error ? legacyErr.message : "";
            if (msg.toLowerCase().includes("too many") || msg.includes("429")) {
              throw legacyErr;
            }
          }
          setStep("linkSent");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }
        throw clerkErr;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Show the server's rate-limit message verbatim; fall back to the
      // generic translation for all other errors (avoids leaking account info).
      const isRateLimit = msg.toLowerCase().includes("too many");
      setError(isRateLimit ? msg : t("forgotPassword.errStart"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: confirm the 6-digit code + set the new password in one call.
  // Clerk returns a fresh session on success; setActive it and route home.
  const handleSubmitVerify = async () => {
    if (!canSubmitVerify || !signIn || !setActive) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/home");
        return;
      }
      // CTL is a single-factor consumer app, but we handle these defensively
      // in case the Clerk tenant config ever flips on 2FA. The user's
      // password IS reset at this point — they just can't be auto-signed-in
      // here. Send them back to the login screen to complete the challenge.
      if (result.status === "needs_second_factor") {
        setError(t("forgotPassword.errReset2fa"));
        setTimeout(() => router.replace("/"), 1500);
        return;
      }
      setError(t("forgotPassword.errResetSignIn"));
      setTimeout(() => router.replace("/"), 1500);
    } catch (err: unknown) {
      if (isClerkAPIResponseError(err) && err.errors.length > 0) {
        const code = err.errors[0].code;
        if (code === "form_code_incorrect" || code === "verification_expired") {
          setError(t("forgotPassword.errInvalidCode"));
        } else if (
          code === "form_password_pwned" ||
          code === "form_password_length_too_short" ||
          code === "form_password_validation_failed" ||
          code === "form_password_not_strong_enough"
        ) {
          setError(t("forgotPassword.errWeak"));
        } else {
          setError(t("forgotPassword.errComplete"));
        }
      } else {
        setError(t("forgotPassword.errComplete"));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signIn) return;
    setError("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setError(t("forgotPassword.errResend"));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SwipeBackView style={[styles.container, { backgroundColor: C.background }]}>

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
            style={{ position: "absolute", top: 0, left: 0, backgroundColor: "transparent" }}
            pointerEvents="none"
          >
            <Polygon
              points={`${Math.round(screenW * 0.57)},0 ${screenW},0 ${screenW},250 ${Math.round(screenW * 0.57)},155`}
              fill={isDark ? "#1D4A96" : "#DBEAFE"}
            />
          </Svg>

          <Text style={[styles.heroTitle, { color: isDark ? "#FFFFFF" : "#0F2D5E" }]}>CTL</Text>
          <View style={styles.heroLines}>
            <View style={styles.heroLineLong} />
            <View style={styles.heroLineShort} />
          </View>
          <Text style={[styles.heroTagline, { color: isDark ? "#93C5FD" : "#2563EB" }, rtlText]}>
            {t("forgotPassword.tagline")}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "email" && (
            <View style={[styles.formCard, { backgroundColor: C.card }]}>
              <View style={styles.welcomeBlock}>
                <Text style={[styles.welcomeTitle, { color: C.text }, rtlText]}>{t("forgotPassword.resetTitle")}</Text>
                <Text style={[styles.welcomeSub, { color: C.textSecondary }, rtlText]}>
                  {t("forgotPassword.resetSub")}
                </Text>
              </View>

              {error !== "" && (
                <View style={[styles.errorBox, { backgroundColor: C.dangerLight }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="alert-circle" size={15} color={C.danger} />
                  <Text style={[styles.errorText, { color: C.danger }, rtlText]}>{error}</Text>
                </View>
              )}

              <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }, rtlText]}>{t("forgotPassword.emailLabel")}</Text>
                <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="mail" size={16} color={C.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: C.text }, rtlText]}
                    placeholder={t("forgotPassword.emailPlaceholder")}
                    placeholderTextColor={C.textTertiary}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmitEmail}
                    autoFocus
                  />
                </View>
              </View>

              <PrimaryButton
                label={t("forgotPassword.sendCode")}
                onPress={handleSubmitEmail}
                loading={loading}
                disabled={!canSubmitEmail || loading}
              />

              <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backLink, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={14} color={C.tint} />
                <Text style={[styles.backLinkText, { color: C.tint }]}>{t("forgotPassword.backToSignIn")}</Text>
              </Pressable>
            </View>
          )}

          {step === "verify" && (
            <View style={[styles.formCard, { backgroundColor: C.card }]}>
              <View style={styles.welcomeBlock}>
                <Text style={[styles.welcomeTitle, { color: C.text }, rtlText]}>{t("forgotPassword.setNewTitle")}</Text>
                <Text style={[styles.welcomeSub, { color: C.textSecondary }, rtlText]}>
                  {t("forgotPassword.setNewSub", { email: email.trim() })}
                </Text>
              </View>

              {error !== "" && (
                <View style={[styles.errorBox, { backgroundColor: C.dangerLight }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="alert-circle" size={15} color={C.danger} />
                  <Text style={[styles.errorText, { color: C.danger }, rtlText]}>{error}</Text>
                </View>
              )}

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }, rtlText]}>{t("forgotPassword.codeLabel")}</Text>
                <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="hash" size={16} color={C.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: C.text, letterSpacing: 4 }, rtlText]}
                    placeholder={t("forgotPassword.codePlaceholder")}
                    placeholderTextColor={C.textTertiary}
                    value={code}
                    onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, "")); setError(""); }}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={6}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }, rtlText]}>{t("forgotPassword.newPasswordLabel")}</Text>
                <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="lock" size={16} color={C.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: C.text }, rtlText]}
                    placeholder="••••••••"
                    placeholderTextColor={C.textTertiary}
                    value={newPassword}
                    onChangeText={(v) => { setNewPassword(v); setError(""); }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmitVerify}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={C.textSecondary} />
                  </Pressable>
                </View>

                {newPassword.length > 0 && (
                  <View style={styles.pwRules}>
                    {passwordRules.map((r) => (
                      <View key={r.key} style={[styles.pwRuleRow, isRTL && { flexDirection: "row-reverse" }]}>
                        <Feather
                          name={r.met ? "check-circle" : "circle"}
                          size={13}
                          color={r.met ? C.success : C.textTertiary}
                        />
                        <Text style={[styles.pwRuleText, { color: r.met ? C.success : C.textSecondary }]}>
                          {r.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <PrimaryButton
                label={t("forgotPassword.resetPassword")}
                onPress={handleSubmitVerify}
                loading={loading}
                disabled={!canSubmitVerify || loading}
              />

              <Pressable onPress={handleResendCode} hitSlop={8} style={[styles.backLink, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name="refresh-cw" size={14} color={C.tint} />
                <Text style={[styles.backLinkText, { color: C.tint }]}>{t("forgotPassword.resendCode")}</Text>
              </Pressable>

              <Pressable
                onPress={() => { setStep("email"); setError(""); setCode(""); setNewPassword(""); }}
                hitSlop={8}
                style={[styles.backLink, isRTL && { flexDirection: "row-reverse" }]}
              >
                <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={14} color={C.tint} />
                <Text style={[styles.backLinkText, { color: C.tint }]}>{t("forgotPassword.useDifferentEmail")}</Text>
              </Pressable>
            </View>
          )}

          {step === "linkSent" && (
            <View style={[styles.formCard, { backgroundColor: C.card }]}>
              <View style={styles.successBlock}>
                <MetalIcon icon="mail" color="#059669" bg="#D1FAE5" size={28} style={styles.successIcon} />
                <Text style={[styles.successTitle, { color: C.text }]}>{t("forgotPassword.checkEmailTitle")}</Text>
                <Text style={[styles.successSub, { color: C.textSecondary }, rtlText]}>
                  {t("forgotPassword.checkEmailPre")}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: C.text }}>{email.trim()}</Text>
                  {t("forgotPassword.checkEmailPost")}
                </Text>
                <Text style={[styles.successNote, { color: C.textSecondary }]}>
                  {t("forgotPassword.linkExpires")}
                </Text>
              </View>

              <PrimaryButton label={t("forgotPassword.backToSignIn")} onPress={() => router.back()} />
            </View>
          )}
        </ScrollView>
      </SwipeBackView>
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
  pwRules: {
    gap: 4,
    marginTop: 6,
  },
  pwRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pwRuleText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
