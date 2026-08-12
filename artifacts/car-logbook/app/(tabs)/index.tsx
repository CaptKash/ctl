import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { isClerkAPIResponseError } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useColors, useTheme } from "@/context/ThemeContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { setLanguage, type SupportedLanguage } from "@/lib/i18n";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

function ToggleSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[
        toggleStyles.track,
        { backgroundColor: value ? "#1A56DB" : "#D1D5DB" },
      ]}
      hitSlop={8}
    >
      <View style={[toggleStyles.thumb, { transform: [{ translateX: value ? 20 : 2 }] }]} />
    </Pressable>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { width: screenW } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const GENERIC_ERROR = t("login.errorGeneric");
  const {
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/home");
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  const canSubmit = email.trim().length > 0 && password.length >= 1 && signInLoaded;

  // ── Clerk sign-in helpers ────────────────────────────────────────────────
  // Treat anything Clerk emits other than form_identifier_not_found as a
  // genuine bad-credentials response. We never reveal whether the email
  // exists — same generic string for "no such user", "wrong password", and
  // "user exists in legacy DB but migrate failed".
  const isUnknownIdentifier = (err: unknown): boolean =>
    isClerkAPIResponseError(err) &&
    err.errors.some((e) => e.code === "form_identifier_not_found");

  // Full cache wipe — used before OAuth only. Removes every SecureStore key
  // the Clerk Expo SDK writes so a stale OAuth client state can't block the
  // OAuth flow. Do NOT call this before email sign-in: deleting
  // __clerk_cache_client_XXXXX while the SDK is initialized can cause a
  // re-init race that makes signIn.create() fail.
  const clearOAuthCache = async () => {
    const suffix = (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").slice(-5);
    await Promise.allSettled([
      SecureStore.deleteItemAsync("__clerk_client_jwt"),
      SecureStore.deleteItemAsync(`__clerk_cache_client_${suffix}`),
      SecureStore.deleteItemAsync(`__clerk_cache_session_jwt_${suffix}`),
    ]);
  };

  const tryClerkSignIn = async (identifier: string, pw: string): Promise<boolean> => {
    if (!signIn || !setActive) {
      console.error("[tryClerkSignIn] signIn resource is null/undefined — Clerk client not ready");
      return false;
    }
    // Clear stale Clerk SecureStore tokens before attempting sign-in.
    //
    // __clerk_client_jwt: safe to delete (prior investigation confirmed this).
    //
    // __clerk_cache_session_jwt_{suffix}: must also be cleared on the email
    // path after a sign-out. clerk.signOut() terminates the session on Clerk's
    // servers, but may leave the revoked session JWT in SecureStore. When
    // signIn.create() is then called, the Clerk SDK reads this stale JWT,
    // sends it to FAPI, and gets back a non-"complete" status (e.g.
    // "needs_first_factor") instead of the expected "complete" — causing
    // tryClerkSignIn to return false and fall through to tryMigrate.
    //
    // We do NOT delete __clerk_cache_client_{suffix} here — that triggers a
    // full client re-initialisation that races with signIn.create() (the
    // regression introduced in Build 110).
    const suffix = (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").slice(-5);
    await Promise.allSettled([
      SecureStore.deleteItemAsync("__clerk_client_jwt"),
      SecureStore.deleteItemAsync(`__clerk_cache_session_jwt_${suffix}`),
    ]);
    let result;
    try {
      result = await signIn.create({ identifier, password: pw });
    } catch (err: unknown) {
      // Log the real Clerk error code before re-throwing so we can diagnose
      // what's actually going wrong (error codes appear in Crashlytics / device logs).
      if (isClerkAPIResponseError(err)) {
        err.errors.forEach((e) =>
          console.error("[tryClerkSignIn] Clerk error:", e.code, e.message, e.longMessage)
        );
      } else {
        console.error("[tryClerkSignIn] unexpected error:", (err as any)?.message ?? err);
      }
      throw err;
    }
    if (result.status === "complete" && result.createdSessionId) {
      await setActive({ session: result.createdSessionId });
      return true;
    }
    // Non-complete status without an exception — log for diagnostics.
    console.error("[tryClerkSignIn] non-complete status:", result.status, JSON.stringify(result));
    return false;
  };

  // POST /auth/clerk/migrate — server bcrypt-checks the legacy hash and, on
  // success, imports the user into Clerk preserving the same hash. Returns
  // true if the user is now in Clerk (whether we just migrated them or a
  // prior attempt already did).
  const tryMigrate = async (identifier: string, pw: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/auth/clerk/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password: pw }),
    });
    if (res.status === 429) {
      throw new Error(t("login.errorTooManyAttempts"));
    }
    // Read the body for ALL responses — including non-ok — so we can inspect
    // alreadyMigrated. We must NOT bail early with `if (!res.ok) return false`
    // because a 409 response carries meaningful information.
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 409 + alreadyMigrated means the password IS correct and the user IS
      // already in Clerk. Returning true lets handleLogin proceed to the
      // step-3 retry of tryClerkSignIn, which is the correct sign-in path.
      if (data?.alreadyMigrated === true) {
        console.error("[tryMigrate] 409 alreadyMigrated — flagging for Clerk retry");
        return true;
      }
      // 401 or other error → genuinely bad credentials or server error.
      return false;
    }
    return data?.migrated === true || data?.alreadyMigrated === true;
  };

  const handleOAuth = async (strategy: "oauth_apple" | "oauth_google") => {
    if (!signIn || !signUp || !setActive) return;
    try {
      setError("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoading(true);
      const redirectUrl = "car-logbook://sso-callback";
      try {
        await clearOAuthCache();
        const result = await signIn.create({ strategy, redirectUrl, actionCompleteRedirectUrl: redirectUrl });
        const externalUrl = result?.firstFactorVerification?.externalVerificationRedirectURL;
        if (!externalUrl) {
          throw new Error(`No external verification URL returned for ${strategy}`);
        }
        const authSessionResult = await WebBrowser.openAuthSessionAsync(
          externalUrl.toString(),
          redirectUrl,
        );
        if (authSessionResult.type !== "success" || !("url" in authSessionResult) || !authSessionResult.url) {
          if (authSessionResult.type !== "cancel" && authSessionResult.type !== "dismiss") {
            console.error("[SSO browser non-success]", strategy, authSessionResult.type);
            setError(t("login.errorOAuthFailed"));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          return;
        }
        const rotatingTokenNonce =
          new URL(authSessionResult.url).searchParams.get("rotating_token_nonce") ?? "";
        await result.reload({ rotatingTokenNonce });
        if (result.firstFactorVerification.status === "transferable") {
          await signUp.create({ transfer: true });
          if (signUp.status === "complete" && signUp.createdSessionId) {
            await setActive({ session: signUp.createdSessionId });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/home");
            return;
          }
        }
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/home");
        } else {
          console.error("[SSO no session]", strategy, "status:", result.status);
          setError(t("login.errorOAuthIncomplete"));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch (err: unknown) {
        const e = err as any;
        console.error("[SSO error]", strategy, e?.message);
        setError(t("login.errorOAuthFailed"));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    } catch (outerErr: unknown) {
      console.error("[SSO outer error]", outerErr);
    }
  };

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    const identifier = email.trim();
    try {
      // 1. Try Clerk directly (covers users who already migrated, or who
      //    signed up new in this build).
      try {
        if (await tryClerkSignIn(identifier, password)) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/home");
          return;
        }
      } catch (err: unknown) {
        if (!isUnknownIdentifier(err)) {
          // Wrong password or unexpected Clerk failure — log so we can diagnose.
          if (isClerkAPIResponseError(err)) {
            err.errors.forEach((e) =>
              console.error("[handleLogin] Clerk error (non-migrate path):", e.code, e.message)
            );
          } else {
            console.error("[handleLogin] non-Clerk error:", (err as any)?.message ?? err);
          }
          setError(GENERIC_ERROR);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        // fall through to migrate path
      }

      // 2. Identifier unknown to Clerk — try the lazy-migration endpoint.
      const migrated = await tryMigrate(identifier, password);
      if (!migrated) {
        setError(GENERIC_ERROR);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      // 3. Retry Clerk sign-in now that the user exists in Clerk.
      try {
        if (await tryClerkSignIn(identifier, password)) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/home");
          return;
        }
        setError(GENERIC_ERROR);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        setError(GENERIC_ERROR);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : GENERIC_ERROR;
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>

        {/* ── Brand hero ─────────────────────────────────────────────── */}
        {/* Brand mark is a Latin wordmark ("CTL" + tagline + accent dashes)
            — same in any language. With forceRTL disabled, the layout
            stays LTR by default, so no extra mirroring guards needed. */}
        <View style={[
          styles.hero,
          {
            paddingTop: topPad + 28,
            backgroundColor: C.heroBg,
            borderBottomColor: C.heroBorder,
            borderBottomWidth: C.heroBorder === "transparent" ? 0 : 2,
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
              fill={C.heroAccent}
            />
          </Svg>
          <Text style={[styles.heroTitle, { color: C.heroText }]}>{t("common.appName")}</Text>
          <View style={styles.heroLines}>
            <View style={styles.heroLineLong} />
            <View style={styles.heroLineShort} />
          </View>
          <Text style={[styles.heroTagline, { color: C.heroTagline }]}>{t("common.appTagline")}</Text>
        </View>

        {/* ── Form ───────────────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 48 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formCard, { backgroundColor: C.card }]}>
            <View style={[styles.welcomeBlock, i18n.language === "ar" && { alignItems: "flex-end" }]}>
              <Text
                style={[
                  styles.welcomeTitle,
                  { color: C.text },
                  i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("login.title")}
              </Text>
              <Text
                style={[
                  styles.welcomeSub,
                  { color: C.textSecondary },
                  i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("login.subtitle")}
              </Text>
            </View>

            {/* OAuth */}
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
                <Text style={[styles.oauthLabel, { color: "#FFFFFF" }]}>{t("login.continueWithApple")}</Text>
              </Pressable>

              <Pressable
                onPress={() => handleOAuth("oauth_google")}
                disabled={loading}
                style={({ pressed }) => [
                  styles.oauthBtn,
                  {
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: C.border,
                    opacity: pressed || loading ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-google" size={18} color="#1A1A1A" />
                <Text style={[styles.oauthLabel, { color: "#1A1A1A" }]}>{t("login.continueWithGoogle")}</Text>
              </Pressable>

              <View style={styles.oauthDivider}>
                <View style={[styles.oauthDividerLine, { backgroundColor: C.border }]} />
                <Text style={[styles.oauthDividerText, { color: C.textTertiary }]}>{t("login.orUseEmail")}</Text>
                <View style={[styles.oauthDividerLine, { backgroundColor: C.border }]} />
              </View>
            </View>

            {error !== "" && (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: C.dangerLight },
                  i18n.language === "ar" && { flexDirection: "row-reverse" },
                ]}
              >
                <Feather name="alert-circle" size={15} color={C.danger} />
                <Text
                  style={[
                    styles.errorText,
                    { color: C.danger },
                    i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}

            <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: C.textSecondary },
                  i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("login.emailLabel")}
              </Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                <Feather name="mail" size={16} color={C.textSecondary} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder={t("login.emailPlaceholder")}
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

            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: C.textSecondary },
                  i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("login.passwordLabel")}
              </Text>
              <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                <Feather name="lock" size={16} color={C.textSecondary} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder={t("login.passwordPlaceholder")}
                  placeholderTextColor={C.textTertiary}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={C.textSecondary} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/forgot-password");
              }}
              hitSlop={8}
              style={styles.forgotBtn}
            >
              <Text style={[styles.forgotText, { color: C.tint }]}>{t("login.forgotPassword")}</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.rememberRow,
              i18n.language === "ar" && { flexDirection: "row-reverse" },
            ]}
            onPress={() => setRememberMe((v) => !v)}
            hitSlop={8}
          >
            <View style={[{ flex: 1 }, i18n.language === "ar" && { alignItems: "flex-end" }]}>
              <Text
                style={[
                  styles.rememberLabel,
                  { color: C.text },
                  i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("login.rememberMe")}
              </Text>
              <Text
                style={[
                  styles.rememberSub,
                  { color: C.textSecondary },
                  i18n.language === "ar" && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("login.rememberMeSub")}
              </Text>
            </View>
            <ToggleSwitch value={rememberMe} onValueChange={setRememberMe} />
          </Pressable>

          <PrimaryButton
            label={t("login.submit")}
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit || loading}
          />

          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: C.textSecondary }]}>
              {t("login.noAccount")}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/signup");
              }}
            >
              <Text style={[styles.signupLink, { color: C.tint }]}>{t("login.signUp")}</Text>
            </Pressable>
          </View>

          {/* Pre-login language toggle. App defaults to English; once the
              user picks a side here it's persisted, and they can change it
              again later from Settings. */}
          <View style={[styles.langSwitch, { backgroundColor: C.backgroundTertiary, borderColor: C.border }]}>
            {(["en", "ar"] as const).map((lng) => {
              const active = i18n.language === lng;
              return (
                <Pressable
                  key={lng}
                  onPress={async () => {
                    if (active) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await setLanguage(lng);
                  }}
                  style={[styles.langSwitchBtn, active && { backgroundColor: C.tint }]}
                >
                  <Text style={[styles.langSwitchText, { color: active ? "#fff" : C.textSecondary }]}>
                    {lng === "ar" ? "العربية" : "English"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.versionText, { color: C.textTertiary }]}>{t("common.version")}</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 32,
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

  // ── Scroll / form ─────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 24, paddingTop: 24, gap: 18 },

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

  signupRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 4 },
  signupText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signupLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  forgotBtn: { alignSelf: "flex-end" },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rememberLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rememberSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  versionText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  langSwitch: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    marginTop: 4,
  },
  langSwitchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  langSwitchText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
