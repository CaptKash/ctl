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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/context/ThemeContext";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { apiPatch } from "@/hooks/useApi";

type ProfileResponse = { user: { id: number; name: string; email: string } };

export default function EditProfileScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const hasChanges =
    name.trim() !== (user?.name ?? "") || email.trim() !== (user?.email ?? "");
  const canSave = hasChanges && name.trim().length > 0 && email.includes("@");

  const handleSave = async () => {
    if (!canSave) return;
    setError("");
    setSaved(false);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { user: updated } = await apiPatch<ProfileResponse>("/auth/profile", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      await updateUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => router.back(), 800);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const initials = name.trim()
    ? name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: C.background }]}>
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
          <Text style={[styles.headerTitle, { color: C.text }]}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar preview */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: C.tint }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={[styles.avatarHint, { color: C.textSecondary }]}>
              Your initials are generated from your name
            </Text>
          </View>

          {/* Form card */}
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <FormField
              label="Full Name"
              required
              value={name}
              onChangeText={(t) => { setName(t); setError(""); setSaved(false); }}
              placeholder="Your name"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
            <FormField
              label="Email Address"
              required
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); setSaved(false); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {/* Error */}
          {error !== "" && (
            <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
              <Feather name="alert-circle" size={15} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {saved && (
            <View style={[styles.successBox, { backgroundColor: "#D1FAE5" }]}>
              <Feather name="check-circle" size={15} color="#059669" />
              <Text style={[styles.successText, { color: "#059669" }]}>
                Profile updated!
              </Text>
            </View>
          )}

          <PrimaryButton
            label={loading ? "Saving…" : "Save Changes"}
            onPress={handleSave}
            loading={loading}
            disabled={!canSave || loading}
          />

          <Text style={[styles.hint, { color: C.textTertiary }]}>
            Changing your email will require you to use the new address at next sign-in.
          </Text>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  headerSpacer: { width: 30 },

  scroll: { padding: 20, gap: 16 },

  avatarSection: { alignItems: "center", paddingVertical: 8, gap: 10 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  successText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
