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
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/context/ThemeContext";
import { apiPost } from "@/hooks/useApi";

export function PasswordUpgradeModal() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isSignedIn: isClerkSignedIn } = useClerkAuth();
  const C = useColors();
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

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? "there";

  const handleSendLink = async () => {
    if (!user?.email) return;
    setSending(true);
    setError(null);
    try {
      await apiPost("/auth/forgot-password", { email: user.email });
      setSent(true);
    } catch {
      setError("Couldn't send the email right now. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setDismissed(true);
  };

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
          <View style={[styles.iconWrap, { backgroundColor: C.infoLight }]}>
            <Feather name="shield" size={28} color={C.tint} />
          </View>

          {!sent ? (
            <>
              <Text style={[styles.title, { color: C.text }]}>
                Hi {firstName}, please update your password
              </Text>
              <Text style={[styles.body, { color: C.textSecondary }]}>
                We've raised CTL's security standards. Your current password no longer meets the
                new requirements (8+ characters, with an uppercase letter, a lowercase letter, and
                a number).
              </Text>
              <Text style={[styles.body, { color: C.textSecondary, marginTop: 12 }]}>
                We'll email a secure link to{" "}
                <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold" }}>{user?.email}</Text>{" "}
                so you can set a stronger one. The link expires in 1 hour.
              </Text>

              {error && (
                <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                  <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>
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
                  <Text style={styles.primaryBtnText}>Email me a secure link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={styles.secondaryBtn}>
                <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>
                  Remind me next time
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: C.text }]}>Check your inbox</Text>
              <Text style={[styles.body, { color: C.textSecondary }]}>
                We sent a secure link to{" "}
                <Text style={{ color: C.text, fontFamily: "Inter_600SemiBold" }}>{user?.email}</Text>
                . Open it on this device to set your new password. The link expires in 1 hour.
              </Text>
              <Text style={[styles.bodySmall, { color: C.textTertiary, marginTop: 12 }]}>
                Don't see it? Check your spam folder, or sign out and tap "Forgot password" on the
                login screen to send another.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.tint }]}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Got it</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setDismissed(true);
                  await logout();
                }}
                style={styles.secondaryBtn}
              >
                <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>
                  Sign out and reset now
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
