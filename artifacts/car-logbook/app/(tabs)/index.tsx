import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
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

  const canSubmit = email.trim().length > 0 && password.length >= 1;

  const handleLogin = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    router.push("/home");
  };

  const handleGuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/home");
  };

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
          {/* Brand block */}
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

          {/* Welcome text */}
          <View style={styles.welcomeBlock}>
            <Text style={[styles.welcomeTitle, { color: C.text }]}>Welcome back</Text>
            <Text style={[styles.welcomeSub, { color: C.textSecondary }]}>
              Sign in to access your fleet and service records
            </Text>
          </View>

          {/* Form card */}
          <View style={[styles.formCard, { backgroundColor: C.card }]}>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Email</Text>
              <View
                style={[
                  styles.inputRow,
                  { borderColor: C.border, backgroundColor: C.backgroundTertiary },
                ]}
              >
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
              <View
                style={[
                  styles.inputRow,
                  { borderColor: C.border, backgroundColor: C.backgroundTertiary },
                ]}
              >
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

          {/* Forgot */}
          <Pressable style={styles.forgotRow} hitSlop={8}>
            <Text style={[styles.forgotText, { color: C.tint }]}>Forgot password?</Text>
          </Pressable>

          {/* Sign In */}
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

          {/* Continue as guest */}
          <Pressable
            onPress={handleGuest}
            style={({ pressed }) => [
              styles.guestBtn,
              {
                borderColor: C.border,
                backgroundColor: pressed ? C.backgroundTertiary : C.card,
              },
            ]}
          >
            <Text style={[styles.guestText, { color: C.text }]}>Continue as Guest</Text>
            <Feather name="arrow-right" size={16} color={C.textSecondary} />
          </Pressable>

          {/* Sign up */}
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
  scroll: { paddingHorizontal: 24, gap: 20 },

  brand: { alignItems: "center", gap: 10, paddingBottom: 4 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 4,
  },
  logo: { width: 80, height: 80 },
  appName: { fontSize: 32, fontFamily: "Inter_700Bold" },
  appTagline: { fontSize: 14, fontFamily: "Inter_400Regular" },

  welcomeBlock: { gap: 6 },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  welcomeSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },

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
  separator: { height: StyleSheet.hairlineWidth },

  forgotRow: { alignItems: "flex-end" },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  orRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  guestText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signupLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
