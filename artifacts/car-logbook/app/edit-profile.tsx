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
import { useTranslation } from "react-i18next";
import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/context/ThemeContext";
import { FormField } from "@/components/ui/FormField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { apiPatch, apiPost } from "@/hooks/useApi";

type ProfileResponse = { user: { id: number; name: string; email: string } };

export default function EditProfileScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, updateUser } = useAuth();
  const { user: clerkUser } = useUser();
  const isClerkUser = !!clerkUser;

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const hasChanges = isClerkUser
    ? name.trim() !== (user?.name ?? "")
    : name.trim() !== (user?.name ?? "") || email.trim() !== (user?.email ?? "");
  const canSave = hasChanges && name.trim().length > 0;

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
        err instanceof Error ? err.message : t("editProfile.errGeneric");
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetSent || resetLoading) return;
    setResetError("");
    setResetLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiPost("/auth/forgot-password", { email: user?.email });
      setResetSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("editProfile.errReset");
      setResetError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResetLoading(false);
    }
  };

  const initials = (() => {
    const trimmed = name.trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2);
    const isArabic = /[\u0600-\u06FF]/.test(trimmed);
    return isArabic ? parts.join(".") : parts.join("").toUpperCase();
  })();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SwipeBackView style={[styles.container, { backgroundColor: C.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 12,
              borderBottomColor: C.border,
              backgroundColor: C.card,
            },
            isRTL && { flexDirection: "row-reverse" },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={12}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.tint} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t("editProfile.title")}</Text>
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
              {t("editProfile.avatarHint")}
            </Text>
          </View>

          {/* Form card */}
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <FormField
              label={t("editProfile.nameLabel")}
              required
              value={name}
              onChangeText={(v) => { setName(v); setError(""); setSaved(false); }}
              placeholder={t("editProfile.namePlaceholder")}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
            <FormField
              label={t("editProfile.emailLabel")}
              required
              value={email}
              onChangeText={isClerkUser ? undefined : (v) => { setEmail(v); setError(""); setSaved(false); }}
              placeholder={t("editProfile.emailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              editable={!isClerkUser}
            />
          </View>

          {/* Error */}
          {error !== "" && (
            <View style={[styles.errorBox, { backgroundColor: C.dangerLight }, isRTL && { flexDirection: "row-reverse" }]}>
              <Feather name="alert-circle" size={15} color={C.danger} />
              <Text style={[styles.errorText, { color: C.danger, textAlign: isRTL ? "right" : "left" }]}>{error}</Text>
            </View>
          )}

          {/* Success */}
          {saved && (
            <View style={[styles.successBox, { backgroundColor: "#D1FAE5" }, isRTL && { flexDirection: "row-reverse" }]}>
              <Feather name="check-circle" size={15} color="#059669" />
              <Text style={[styles.successText, { color: "#059669" }]}>
                {t("editProfile.profileUpdated")}
              </Text>
            </View>
          )}

          <PrimaryButton
            label={loading ? t("editProfile.saving") : t("editProfile.save")}
            onPress={handleSave}
            loading={loading}
            disabled={!canSave || loading}
          />

          <Text style={[styles.hint, { color: C.textTertiary }]}>
            {t("editProfile.emailHint")}
          </Text>

          {/* Reset Password — only for legacy (non-Clerk) users */}
          {!isClerkUser && <Pressable
            onPress={handleResetPassword}
            disabled={resetSent || resetLoading}
            style={({ pressed }) => [
              styles.resetBtn,
              {
                borderColor: resetSent ? "#059669" : C.tint,
                backgroundColor: resetSent ? "#D1FAE5" : C.infoLight,
                opacity: pressed || resetLoading ? 0.7 : 1,
              },
              isRTL && { flexDirection: "row-reverse" },
            ]}
          >
            <Feather
              name={resetSent ? "check-circle" : "lock"}
              size={17}
              color={resetSent ? "#059669" : C.tint}
            />
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.resetBtnLabel, { color: resetSent ? "#059669" : C.tint }]}>
                {resetLoading ? t("editProfile.sending") : resetSent ? t("editProfile.resetLinkSent") : t("editProfile.resetPassword")}
              </Text>
              {resetSent && (
                <Text style={[styles.resetHint, { color: "#059669" }]}>
                  {t("editProfile.sentTo", { email: user?.email })}
                </Text>
              )}
              {resetError !== "" && (
                <Text style={[styles.resetHint, { color: C.danger }]}>{resetError}</Text>
              )}
            </View>
          </Pressable>}
        </ScrollView>
      </SwipeBackView>
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

  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  resetBtnLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resetHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
});
