import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { useAuth } from "@/context/AuthContext";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const {
    user,
    logout,
    biometricAvailable,
    biometricEnrolled,
    enableBiometric,
    disableBiometric,
  } = useAuth();

  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricLoading(true);
    try {
      if (value) {
        await enableBiometric();
      } else {
        await disableBiometric();
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="user" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Account</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Manage your account</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={[styles.profileCard, { backgroundColor: C.card }]}>
          <View style={[styles.avatar, { backgroundColor: C.tint }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: C.text }]}>{user?.name ?? "—"}</Text>
            <Text style={[styles.profileEmail, { color: C.textSecondary }]}>{user?.email ?? "—"}</Text>
          </View>
        </View>

        {/* Security */}
        {biometricAvailable && biometricEnrolled && (
          <View style={[styles.section, { backgroundColor: C.card }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Security</Text>
            <View style={styles.row}>
              <Feather name="shield" size={18} color={C.tint} style={styles.rowIcon} />
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: C.text }]}>Biometric Login</Text>
                <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                  Use Face ID or fingerprint to sign in
                </Text>
              </View>
              <Switch
                value={biometricEnrolled}
                onValueChange={handleBiometricToggle}
                disabled={biometricLoading}
                trackColor={{ true: C.tint, false: C.border }}
                thumbColor="#fff"
              />
            </View>
          </View>
        )}

        {/* Sign out */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="log-out" size={18} color={C.danger} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: C.danger }]}>Sign Out</Text>
            <Feather name="chevron-right" size={16} color={C.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav active="account" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 12,
  },
  profileCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  section: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: { width: 24, textAlign: "center" },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
