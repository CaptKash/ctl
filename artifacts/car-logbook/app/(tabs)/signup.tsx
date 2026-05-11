import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useSignUp, useSSO, isClerkAPIResponseError } from "@clerk/clerk-expo";
import { useColors, useTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { width: screenW } = useWindowDimensions();
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  // Seconds remaining before the user can request another verification
  // code. Set to 60 after each successful prepare/resend; ticks down to 0
  // via the effect below. While > 0, the Resend button shows the
  // countdown and is disabled — protects Clerk's per-user resend rate
  // limit and reads as a friendlier "give it a moment" instead of a
  // generic error.
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const passwordRules = [
    { key: "len", label: "At least 8 characters", met: password.length >= 8 },
    { key: "upper", label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { key: "lower", label: "One lowercase letter (a–z)", met: /[a-z]/.test(password) },
    { key: "num", label: "One number (0–9)", met: /[0-9]/.test(password) },
  ];
  const passwordValid = passwordRules.every((r) => r.met);

  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().includes("@") &&
    passwordValid &&
    confirmPassword === password &&
    signUpLoaded;

  // Map Clerk error codes to user-safe messages. We deliberately do NOT
  // surface the raw Clerk error string for sign-up — that leaks account
  // existence (e.g., "form_identifier_exists" → "email already in use"),
  // which is an enumeration channel. Verification + password rule errors
  // are safe to make specific because they reveal nothing about whether
  // an account already exists.
  const formatSignUpError = (err: unknown, fallback: string): string => {
    if (isClerkAPIResponseError(err) && err.errors.length > 0) {
      const code = err.errors[0].code;
      switch (code) {
        case "form_password_pwned":
        case "form_password_length_too_short":
        case "form_password_validation_failed":
        case "form_password_not_strong_enough":
          return "Please choose a stronger password.";
        case "form_param_format_invalid":
        case "form_param_nil":
          return "Please double-check the details you entered.";
        // form_identifier_exists, form_identifier_not_allowed, and any
        // other identifier-related codes fall through to the generic
        // message to avoid revealing whether the email is already taken.
        default:
          return fallback;
      }
    }
    return fallback;
  };

  const formatVerifyError = (err: unknown, fallback: string): string => {
    if (isClerkAPIResponseError(err) && err.errors.length > 0) {
      const code = err.errors[0].code;
      if (code === "form_code_incorrect" || code === "verification_expired") {
        return "Invalid or expired code. Please try again.";
      }
    }
    return fallback;
  };

  // Step 1: create the Clerk user and ask Clerk to send the email verification
  // code. The local DB row is created later by /auth/clerk/sync-user (called
  // automatically from AuthContext when the Clerk session goes active).
  const handleSignup = async () => {
    if (!canSubmit || !signUp) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const trimmedName = name.trim();
      const [firstName, ...rest] = trimmedName.split(/\s+/);
      const lastName = rest.join(" ") || undefined;
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName || trimmedName,
        lastName,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
      setCode("");
      setResendCooldown(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      setError(formatSignUpError(err, "Couldn't create your account. Please check your details and try again."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: confirm the 6-digit email code, activate the session — the
  // AuthContext sync-user effect mirrors the user into the local DB.
  const handleVerify = async () => {
    if (!signUp || !setActive || code.trim().length < 4) return;
    setError("");
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/home");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      setError(formatVerifyError(err, "Invalid or expired code. Please try again."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signUp || resendCooldown > 0) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendCooldown(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      setError(formatVerifyError(err, "Couldn't resend the code right now."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleOAuth = async (strategy: "oauth_apple" | "oauth_google") => {
    if (!setActive) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      // Use the app scheme root rather than a route-group path. Route
      // groups (parens) aren't URL-facing in Expo Router so deep-link
      // matching against "/(tabs)" is fragile across providers.
      const redirectUrl = Linking.createURL("/");
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      if (createdSessionId) {
        const activator = ssoSetActive ?? setActive;
        await activator({ session: createdSessionId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/home");
      }
      // No createdSessionId means the user cancelled — silent no-op.
    } catch (err: unknown) {
      if (__DEV__) {
        console.log("[SSO error]", strategy, JSON.stringify(err, null, 2), err);
        const raw =
          err instanceof Error
            ? `${err.name}: ${err.message}`
            : typeof err === "string"
              ? err
              : JSON.stringify(err);
        setError(`[dev] ${strategy}: ${raw.slice(0, 300)}`);
      } else {
        setError(formatSignUpError(err, "Sign-in failed. Please try again."));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>

        {/* ── Brand hero ─────────────────────────────────────────────── */}
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
          <Text style={[styles.heroTagline, { color: isDark ? "#93C5FD" : "#2563EB" }]}>
            Car Technical Log
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: 24, paddingBottom: insets.bottom + 48 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "form" && (
          <>
          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: C.card }]}>
            {/* Heading */}
            <View style={styles.welcomeBlock}>
              <Text style={[styles.welcomeTitle, { color: C.text }]}>Create account</Text>
              <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
                Start logging your fleet's full service history
              </Text>
            </View>

            {/* OAuth (visual preview — wired up in next release) */}
            <View style={styles.oauthBlock}>
              <Pressable
                onPress={() => handleOAuth("oauth_apple")}
                disabled={loading}
                style={({ pressed }) => [
                  styles.oauthBtn,
                  { backgroundColor: "#000000", opacity: pressed || loading ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                <Text style={[styles.oauthLabel, { color: "#FFFFFF" }]}>Continue with Apple</Text>
              </Pressable>

              <Pressable
                onPress={() => handleOAuth("oauth_google")}
                disabled={loading}
                style={({ pressed }) => [
                  styles.oauthBtn,
                  {
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: isDark ? "transparent" : C.border,
                    opacity: pressed || loading ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-google" size={18} color="#1A1A1A" />
                <Text style={[styles.oauthLabel, { color: "#1A1A1A" }]}>Continue with Google</Text>
              </Pressable>

              <View style={styles.oauthDivider}>
                <View style={[styles.oauthDividerLine, { backgroundColor: C.border }]} />
                <Text style={[styles.oauthDividerText, { color: C.textTertiary }]}>or use email</Text>
                <View style={[styles.oauthDividerLine, { backgroundColor: C.border }]} />
              </View>
            </View>

            {/* Error */}
            {error !== "" && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Feather name="alert-circle" size={15} color={C.danger} />
                <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
              </View>
            )}

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Full Name</Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                <Feather name="user" size={16} color={C.textSecondary} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="John Smith"
                  placeholderTextColor={C.textTertiary}
                  value={name}
                  onChangeText={(t) => { setName(t); setError(""); }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

            {/* Email */}
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
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Password</Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                <Feather name="lock" size={16} color={C.textSecondary} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={C.textTertiary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={C.textSecondary} />
                </Pressable>
              </View>

              {/* Password requirements checklist (appears once user starts typing) */}
              {password.length > 0 && (
                <View style={styles.pwRules}>
                  {passwordRules.map((r) => (
                    <View key={r.key} style={styles.pwRuleRow}>
                      <Feather
                        name={r.met ? "check-circle" : "circle"}
                        size={13}
                        color={r.met ? C.success : C.textTertiary}
                      />
                      <Text
                        style={[
                          styles.pwRuleText,
                          { color: r.met ? C.success : C.textSecondary },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Confirm Password</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    borderColor: !passwordsMatch ? C.danger : C.border,
                    backgroundColor: C.backgroundTertiary,
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={16}
                  color={!passwordsMatch ? C.danger : C.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={C.textTertiary}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />
                {confirmPassword.length > 0 && (
                  <Feather
                    name={passwordsMatch ? "check-circle" : "x-circle"}
                    size={16}
                    color={passwordsMatch ? C.success : C.danger}
                  />
                )}
              </View>
            </View>
          </View>

          <PrimaryButton
            label="Create Account"
            onPress={handleSignup}
            loading={loading}
            disabled={!canSubmit || loading}
          />

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: C.border }]} />
            <Text style={[styles.orText, { color: C.textTertiary }]}>already have an account?</Text>
            <View style={[styles.orLine, { backgroundColor: C.border }]} />
          </View>

          {/* Sign in link */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/");
            }}
            style={({ pressed }) => [
              styles.signinBtn,
              { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.card },
            ]}
          >
            <Text style={[styles.signinText, { color: C.text }]}>Sign In</Text>
            <Feather name="arrow-right" size={16} color={C.textSecondary} />
          </Pressable>
          </>
          )}

          {step === "verify" && (
          <>
          <View style={[styles.formCard, { backgroundColor: C.card }]}>
            <View style={styles.welcomeBlock}>
              <Text style={[styles.welcomeTitle, { color: C.text }]}>Check your email</Text>
              <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
                We sent a 6-digit code to {email.trim()}. Enter it below to finish creating your account.
              </Text>
            </View>

            {error !== "" && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Feather name="alert-circle" size={15} color={C.danger} />
                <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Verification code</Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                <Feather name="hash" size={16} color={C.textSecondary} />
                <TextInput
                  style={[styles.input, { color: C.text, letterSpacing: 4 }]}
                  placeholder="123456"
                  placeholderTextColor={C.textTertiary}
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, "")); setError(""); }}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                />
              </View>
            </View>
          </View>

          <PrimaryButton
            label="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || code.trim().length < 4}
          />

          <Pressable
            onPress={handleResendCode}
            disabled={resendCooldown > 0}
            style={({ pressed }) => [
              styles.signinBtn,
              {
                borderColor: C.border,
                backgroundColor: pressed && resendCooldown === 0 ? C.backgroundTertiary : C.card,
                opacity: resendCooldown > 0 ? 0.55 : 1,
              },
            ]}
          >
            <Text style={[styles.signinText, { color: resendCooldown > 0 ? C.textSecondary : C.text }]}>
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </Text>
            <Feather name="refresh-cw" size={16} color={C.textSecondary} />
          </Pressable>

          <Pressable
            onPress={() => { setStep("form"); setError(""); setCode(""); }}
            style={({ pressed }) => [
              styles.signinBtn,
              { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.card },
            ]}
          >
            <Feather name="arrow-left" size={16} color={C.textSecondary} />
            <Text style={[styles.signinText, { color: C.text }]}>Back</Text>
          </Pressable>
          </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 18 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: "#0F2D5E",
    paddingHorizontal: 28,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 160,
    height: 160,
    backgroundColor: "#071A40",
    borderBottomLeftRadius: 999,
  },
  heroTitle: {
    fontSize: 72,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 76,
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
    color: "#93C5FD",
    marginTop: 10,
  },

  welcomeBlock: { gap: 6 },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  welcomeSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },

  formCard: { borderRadius: 16, padding: 16, gap: 14 },

  // ── OAuth ────────────────────────────────────────────────────────────────
  oauthBlock: { gap: 10 },
  oauthBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  oauthLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  oauthDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  oauthDividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  oauthDividerText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "lowercase" },

  // ── Password rules ──────────────────────────────────────────────────────
  pwRules: { gap: 6, marginTop: 8, paddingLeft: 2 },
  pwRuleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pwRuleText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },


  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth },

  orRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 11, fontFamily: "Inter_400Regular" },

  signinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  signinText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
