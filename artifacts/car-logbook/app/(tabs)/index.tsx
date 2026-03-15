import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/hooks/useApi";

type ForgotStep = "email" | "sent" | "reset";

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

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

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
      await login(res.token, res.user);
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

  const openForgotModal = () => {
    setForgotEmail(email.trim());
    setForgotStep("email");
    setForgotError("");
    setResetToken("");
    setNewPassword("");
    setResetError("");
    setForgotVisible(true);
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError("");
    try {
      await apiPost("/auth/forgot-password", { email: forgotEmail.trim() });
      setForgotStep("sent");
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!resetToken.trim() || !newPassword) return;
    setResetLoading(true);
    setResetError("");
    try {
      const res = await apiPost<{ message: string }>("/auth/reset-password", {
        token: resetToken.trim(),
        newPassword,
      });
      Alert.alert("Success", res.message);
      setForgotVisible(false);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResetLoading(false);
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
            <View style={[styles.logoBox, { backgroundColor: "#080F1E" }]}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.appName, { color: C.text }]}>CTL</Text>
            <Text style={[styles.appTagline, { color: C.textSecondary }]}>
              Car Technical Log
            </Text>
          </View>

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

          <View style={[styles.formCard, { backgroundColor: C.card }]}>
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

          <Pressable style={styles.forgotRow} hitSlop={8} onPress={openForgotModal}>
            <Text style={[styles.forgotText, { color: C.tint }]}>Forgot password?</Text>
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
                <MaterialCommunityIcons name="fingerprint" size={24} color={C.tint} />
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
        </ScrollView>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setForgotVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 }]}>
            <Pressable onPress={() => setForgotVisible(false)} hitSlop={10}>
              <Feather name="x" size={22} color={C.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              {forgotStep === "reset" ? "Reset Password" : "Forgot Password"}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {forgotStep === "email" && (
              <>
                <Text style={[styles.modalDesc, { color: C.textSecondary }]}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>

                {forgotError !== "" && (
                  <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                    <Feather name="alert-circle" size={15} color={C.danger} />
                    <Text style={[styles.errorText, { color: C.danger }]}>{forgotError}</Text>
                  </View>
                )}

                <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                  <Feather name="mail" size={16} color={C.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: C.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={C.textTertiary}
                    value={forgotEmail}
                    onChangeText={(t) => { setForgotEmail(t); setForgotError(""); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleForgotSubmit}
                  />
                </View>

                <PrimaryButton
                  label="Send Reset Instructions"
                  onPress={handleForgotSubmit}
                  loading={forgotLoading}
                  disabled={!forgotEmail.trim() || forgotLoading}
                />
              </>
            )}

            {forgotStep === "sent" && (
              <>
                <View style={styles.sentIcon}>
                  <Feather name="check-circle" size={48} color={C.success} />
                </View>
                <Text style={[styles.sentTitle, { color: C.text }]}>Check your email</Text>
                <Text style={[styles.modalDesc, { color: C.textSecondary, textAlign: "center" }]}>
                  If an account with that email exists, you'll receive reset instructions shortly.
                </Text>
                <PrimaryButton
                  label="I Have a Reset Code"
                  onPress={() => setForgotStep("reset")}
                />
                <Pressable
                  onPress={() => setForgotVisible(false)}
                  style={styles.backToLogin}
                >
                  <Text style={[styles.backToLoginText, { color: C.tint }]}>Back to Sign In</Text>
                </Pressable>
              </>
            )}

            {forgotStep === "reset" && (
              <>
                <Text style={[styles.modalDesc, { color: C.textSecondary }]}>
                  Enter the reset code from your email and choose a new password.
                </Text>

                {resetError !== "" && (
                  <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                    <Feather name="alert-circle" size={15} color={C.danger} />
                    <Text style={[styles.errorText, { color: C.danger }]}>{resetError}</Text>
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Reset Code</Text>
                  <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                    <Feather name="key" size={16} color={C.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: C.text }]}
                      placeholder="Paste your reset code"
                      placeholderTextColor={C.textTertiary}
                      value={resetToken}
                      onChangeText={(t) => { setResetToken(t); setResetError(""); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>
                    New Password <Text style={{ color: C.textTertiary, fontSize: 11 }}>(min 6 chars)</Text>
                  </Text>
                  <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.backgroundTertiary }]}>
                    <Feather name="lock" size={16} color={C.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: C.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={C.textTertiary}
                      value={newPassword}
                      onChangeText={(t) => { setNewPassword(t); setResetError(""); }}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <PrimaryButton
                  label="Reset Password"
                  onPress={handleResetSubmit}
                  loading={resetLoading}
                  disabled={!resetToken.trim() || newPassword.length < 6 || resetLoading}
                />

                <Pressable
                  onPress={() => setForgotStep("sent")}
                  style={styles.backToLogin}
                >
                  <Text style={[styles.backToLoginText, { color: C.tint }]}>Back</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 24, gap: 18 },

  brand: { alignItems: "center", gap: 10, paddingBottom: 4 },
  logoBox: { width: 80, height: 80, borderRadius: 20, overflow: "hidden", marginBottom: 4 },
  logo: { width: 80, height: 80 },
  appName: { fontSize: 32, fontFamily: "Inter_700Bold" },
  appTagline: { fontSize: 14, fontFamily: "Inter_400Regular" },

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

  forgotRow: { alignItems: "flex-end" },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium" },

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

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { paddingHorizontal: 24, gap: 18, paddingBottom: 40 },
  modalDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

  sentIcon: { alignItems: "center", paddingTop: 16 },
  sentTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  backToLogin: { alignItems: "center", paddingVertical: 8 },
  backToLoginText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
