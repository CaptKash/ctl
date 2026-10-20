import React, { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useEventReminders } from "@/context/EventRemindersContext";
import { useColors } from "@/context/ThemeContext";
import { requestNotificationPermissions } from "@/lib/notifications";

const PRIMER_KEY = "ctl_notif_primer_v2_shown";

async function wasPrimerShown(): Promise<boolean> {
  try {
    if (Platform.OS === "web") return localStorage.getItem(PRIMER_KEY) === "true";
    return (await SecureStore.getItemAsync(PRIMER_KEY)) === "true";
  } catch {
    return false;
  }
}

async function markPrimerShown(): Promise<void> {
  try {
    if (Platform.OS === "web") localStorage.setItem(PRIMER_KEY, "true");
    else await SecureStore.setItemAsync(PRIMER_KEY, "true");
  } catch {}
}

export function NotificationPermissionPrimer() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { user } = useAuth();
  const { enabled, loading, setEnabled } = useEventReminders();
  const C = useColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (Platform.OS === "web") return;
    if (loading) return;
    if (enabled) return;

    let cancelled = false;
    (async () => {
      if (await wasPrimerShown()) return;
      if (!cancelled) setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, enabled, loading]);

  const dismiss = async () => {
    setVisible(false);
    await markPrimerShown();
  };

  const enable = async () => {
    const granted = await requestNotificationPermissions();
    await setEnabled(true);
    await dismiss();
    if (!granted) {
      Alert.alert(
        t("settings.notifications.disabledTitle"),
        t("settings.notifications.disabledMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("settings.notifications.openSettings"), onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <MetalIcon icon="bell" color="#D97706" bg="#FEF3C7" size={28} style={styles.iconWrap} />
          <Text
            style={[
              styles.title,
              { color: C.text },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {t("settings.notifications.primerTitle")}
          </Text>
          <Text
            style={[
              styles.body,
              { color: C.textSecondary },
              isRTL && { writingDirection: "rtl" },
            ]}
          >
            {t("settings.notifications.primerBody")}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: "#D97706", opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={enable}
          >
            <Text style={styles.primaryBtnText}>
              {t("settings.notifications.primerEnable")}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={dismiss}
          >
            <Text style={[styles.secondaryBtnText, { color: C.textSecondary }]}>
              {t("settings.notifications.primerLater")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 24,
  },
  primaryBtn: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
