import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    Alert.alert(
      "Coming Soon",
      "User authentication will be available in a future update.",
      [{ text: "OK" }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: C.backgroundSecondary }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="x" size={22} color={C.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]}>Login</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome block */}
          <View style={styles.welcome}>
            <View style={[styles.logoCircle, { backgroundColor: C.tint }]}>
              <Feather name="user" size={32} color="#fff" />
            </View>
            <Text style={[styles.welcomeTitle, { color: C.text }]}>Welcome back</Text>
            <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
              Sign in to sync your logbook across devices
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.form, { backgroundColor: C.card }]}>
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
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: C.borderLight }]} />

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
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color={C.textSecondary}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Forgot password */}
          <Pressable style={styles.forgotRow} hitSlop={8}>
            <Text style={[styles.forgotText, { color: C.tint }]}>Forgot password?</Text>
          </Pressable>

          <PrimaryButton
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit}
          />

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: C.border }]} />
            <Text style={[styles.orText, { color: C.textTertiary }]}>or</Text>
            <View style={[styles.orLine, { backgroundColor: C.border }]} />
          </View>

          {/* Sign up link */}
          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: C.textSecondary }]}>
              Don't have an account?{" "}
            </Text>
            <Pressable hitSlop={8}>
              <Text style={[styles.signupLink, { color: C.tint }]}>Sign up</Text>
            </Pressable>
          </View>
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

  content: { padding: 24, gap: 16 },

  welcome: { alignItems: "center", gap: 12, paddingVertical: 12 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  welcomeSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  form: { borderRadius: 16, padding: 16, gap: 12 },
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
  separator: { height: StyleSheet.hairlineWidth },

  forgotRow: { alignItems: "flex-end" },
  forgotText: { fontSize: 14, fontFamily: "Inter_500Medium" },

  orRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signupLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
