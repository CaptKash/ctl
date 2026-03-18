import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
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
import { LogoMark } from "@/components/ui/LogoMark";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/hooks/useApi";

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
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const {
    login,
    isAuthenticated,
    isLoading: authLoading,
    biometricAvailable,
    biometricEnrolled,
    authenticateWithBiometric,
    enableBiometric,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const promptBiometricEnrollment = useCallback(() => {
    if (Platform.OS === "web") return;
    Alert.alert(
      "Enable Biometric Sign-In?",
      "Use Face ID or Touch ID to sign in faster next time.",
      [
        { text: "Skip", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            await enableBiometric();
          },
        },
      ],
    );
  }, [enableBiometric]);

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

  const canSubmit = email.trim().length > 0 && password.length >= 1;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const res = await apiPost<{ token: string; user: { id: number; name: string; email: string } }>(
        "/auth/login",
        { email: email.trim(), password },
      );
      await login(res.token, res.user, rememberMe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (biometricAvailable && !biometricEnrolled) {
        promptBiometricEnrollment();
      }

      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await authenticateWithBiometric();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/home");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const showBiometricButton = biometricAvailable && biometricEnrolled;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 24, paddingBottom: insets.bottom + 48 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <LogoMark size={80} />
            <Text style={[styles.appTagline, { color: C.text }]}>
              Car Technical Log
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: C.card }]}>
            <View style={styles.welcomeBlock}>
              <Text style={[styles.welcomeTitle, { color: C.text }]}>Sign in</Text>
              <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
                Access your fleet and service records
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
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={[styles.sep, { backgroundColor: C.borderLight }]} />

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
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={C.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberMe((v) => !v)}
            hitSlop={8}
          >
            <View>
              <Text style={[styles.rememberLabel, { color: C.text }]}>Remember me</Text>
              <Text style={[styles.rememberSub, { color: C.textSecondary }]}>
                Stay signed in after closing the app
              </Text>
            </View>
            <ToggleSwitch value={rememberMe} onValueChange={setRememberMe} />
          </Pressable>

          <PrimaryButton
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit || loading}
          />

          {showBiometricButton && (
            <>
              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: C.border }]} />
                <Text style={[styles.orText, { color: C.textTertiary }]}>or</Text>
                <View style={[styles.orLine, { backgroundColor: C.border }]} />
              </View>

              <Pressable
                onPress={handleBiometricLogin}
                style={({ pressed }) => [
                  styles.biometricBtn,
                  { borderColor: C.border, backgroundColor: pressed ? C.backgroundTertiary : C.card },
                ]}
              >
                <Ionicons name="finger-print-outline" size={24} color={C.tint} />
                <Text style={[styles.biometricText, { color: C.text }]}>
                  Sign in with Biometrics
                </Text>
              </Pressable>
            </>
          )}

          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: C.textSecondary }]}>
              Don't have an account?{" "}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/signup");
              }}
            >
              <Text style={[styles.signupLink, { color: C.tint }]}>Sign up</Text>
            </Pressable>
          </View>

          <Text style={[styles.versionText, { color: C.textTertiary }]}>CTL v1.0.0</Text>
        </ScrollView>
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 24, gap: 18 },

  brand: { alignItems: "center", gap: 10, paddingBottom: 24 },
  logoBox: { width: 80, height: 80, borderRadius: 20, overflow: "hidden", marginBottom: 4 },
  logo: { width: 80, height: 80 },
  appName: { fontSize: 32, fontFamily: "Inter_700Bold" },
  appTagline: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 6 },

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

  orRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  biometricText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signupLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rememberLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rememberSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  versionText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
