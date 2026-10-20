import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/context/ThemeContext";
import { apiPost } from "@/hooks/useApi";

export function PasswordUpgradeModal() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppress for any user already on Clerk: their password is now managed
  // by Clerk and meets Clerk's strength rules, so the legacy
  // passwordUpgradeRequired flag (set when the bcrypt hash failed the new
  // policy) is moot. Only legacy users still on the old JWT path should
  // see this modal.
  const visible =
    Platform.OS !== "web" &&
    isAuthenticated &&
    !isClerkSignedIn &&
    !!user?.passwordUpgradeRequired &&
    !dismissed;

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? t("passwordUpgrade.fallbackName");

  const handleSendLink = async () => {
    if (!user?.email) return;
    setSending(true);
    setError(null);
    try {
      await apiPost("/auth/forgot-password", { email: user.email });
      setSent(true);
    } catch {
      setError(t("passwordUpgrade.errSend"));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setDismissed(true);
  };

  const textAlign = isRTL ? "right" : "left";
  const writingDirection = isRTL ? "rtl" : "ltr";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: C.overlay }]}>
        <View style={[styles.card, { backgroundColor: C.card, shadowColor: C.shadow }]}>
          <MetalIcon icon="shield" color={C.tint} bg={C.infoLight} size={28} style={styles.iconWrap} />

          {!sent ? (
            <>
              <Text style={[styles.title, { color: C.text, textAlign, writingDirection }]}>
                {t("passwordUpgrade.title", { name: firstName })}
              </Text>
              <Text style={[styles.body, { color: C.textSecondary, textAlign, writingDirection }]}>
                {t("passwordUpgrade.body")}
              </Text>
              <Text style={[styles.body, { color: C.textSecondary, marginTop: 12, textAlign, writingDirection }]}>
                {t("passwordUpgrade.body2Pre")}
                <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold" }}>{user?.email}</Text>
                {t("passwordUpgrade.body2Post")}
              </Text>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                  <Text style={[styles.errorText, { color: C.danger, textAlign, writingDirection }]}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.tint, opacity: sending ? 0.6 : 1 }]}
                onPress={handleSendLink}
                disabled={sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("passwordUpgrade.sendLink")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={styles.secondaryBtn}>
                <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>
                  {t("passwordUpgrade.remindLater")}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: C.text, textAlign, writingDirection }]}>{t("passwordUpgrade.sentTitle")}</Text>
              <Text style={[styles.body, { color: C.textSecondary, textAlign, writingDirection }]}>
                {t("passwordUpgrade.sentBodyPre")}
                <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold" }}>{user?.email}</Text>
                {t("passwordUpgrade.sentBodyPost")}
              </Text>
              <Text style={[styles.bodySmall, { color: C.textTertiary, marginTop: 12, textAlign, writingDirection }]}>
                {t("passwordUpgrade.sentNote")}
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.tint }]}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t("passwordUpgrade.gotIt")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setDismissed(true);
                  await logout();
                }}
                style={styles.secondaryBtn}
              >
                <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>
                  {t("passwordUpgrade.signOutReset")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 28,
    alignItems: "stretch",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 10,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 22,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
