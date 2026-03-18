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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { LogoMark } from "@/components/ui/LogoMark";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/hooks/useApi";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().includes("@") &&
    password.length >= 6 &&
    confirmPassword === password;

  const handleSignup = async () => {
    if (!canSubmit) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const res = await apiPost<{ token: string; user: { id: number; name: string; email: string } }>(
        "/auth/register",
        { name: name.trim(), email: email.trim(), password }
      );
      await login(res.token, res.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

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
          {/* Brand */}
          <View style={styles.brand}>
            <LogoMark size={80} />
            <Text style={[styles.appTagline, { color: C.text }]}>
              Car Technical Log
            </Text>
          </View>

          {/* Heading */}
          <View style={styles.welcomeBlock}>
            <Text style={[styles.welcomeTitle, { color: C.text }]}>Create account</Text>
            <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
              Start logging your fleet's full service history
            </Text>
          </View>

          {/* Error */}
          {error !== "" && (
            <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
              <Feather name="alert-circle" size={15} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: C.card }]}>
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
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>
                Password <Text style={{ color: C.textTertiary, fontSize: 11 }}>(min 6 chars)</Text>
              </Text>
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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, gap: 18 },

  brand: { alignItems: "center", gap: 10, paddingBottom: 4 },
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
