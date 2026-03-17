import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/hooks/useApi";

type Car = { id: number };

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
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const { data: cars = [] } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
    staleTime: 30_000,
  });

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricLoading(true);
    try {
      if (value) await enableBiometric();
      else await disableBiometric();
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
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
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Profile & security</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: C.card }]}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: C.tint }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={[styles.profileName, { color: C.text }]}>{user?.name ?? "—"}</Text>
          <Text style={[styles.profileEmail, { color: C.textSecondary }]}>{user?.email ?? "—"}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>{cars.length}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Vehicles</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.borderLight }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.text }]}>CTL</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>Plan</Text>
            </View>
          </View>
        </View>

        {/* Account actions */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Pressable
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={[styles.rowIcon, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="edit-2" size={16} color="#2563EB" />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: C.text }]}>Edit Profile</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>Update name or email</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: C.tint + "18" }]}>
              <Text style={[styles.pillText, { color: C.tint }]}>Soon</Text>
            </View>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <Pressable
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/fleet");
            }}
          >
            <View style={[styles.rowIcon, { backgroundColor: "#EDE9FE" }]}>
              <Feather name="truck" size={16} color="#7C3AED" />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: C.text }]}>My Fleet</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                {cars.length === 0 ? "No vehicles yet" : `${cars.length} vehicle${cars.length !== 1 ? "s" : ""} registered`}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textTertiary} />
          </Pressable>
        </View>

        {/* Security */}
        {biometricAvailable && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>SECURITY</Text>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Feather name="shield" size={16} color="#059669" />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: C.text }]}>Biometric Login</Text>
                  <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                    {biometricEnrolled ? "Face ID or fingerprint enabled" : "Use Face ID or fingerprint to sign in"}
                  </Text>
                </View>
                <Switch
                  value={biometricEnrolled}
                  onValueChange={handleBiometricToggle}
                  disabled={biometricLoading}
                  trackColor={{ true: "#059669", false: C.border }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Feather name="lock" size={16} color="#D97706" />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowTitle, { color: C.text }]}>Change Password</Text>
                  <Text style={[styles.rowSub, { color: C.textSecondary }]}>Update your login credentials</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: C.tint + "18" }]}>
                  <Text style={[styles.pillText, { color: C.tint }]}>Soon</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Session */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>SESSION</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSignOutModal(true);
            }}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[styles.rowIcon, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="log-out" size={16} color="#DC2626" />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: "#DC2626" }]}>Sign Out</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>You'll need to log in again</Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.textTertiary} />
          </Pressable>
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#FEE2E2" }]}>
              <Feather name="trash-2" size={16} color="#DC2626" />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: "#DC2626" }]}>Delete Account</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>Permanently erase all data</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: "#FEE2E2" }]}>
              <Text style={[styles.pillText, { color: "#DC2626" }]}>Soon</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.version, { color: C.textTertiary }]}>CTL v1.0.0</Text>
      </ScrollView>

      <BottomNav active="account" />

      <ConfirmModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of CTL?"
        confirmLabel="Sign Out"
        onConfirm={() => {
          setShowSignOutModal(false);
          handleLogout();
        }}
        onCancel={() => setShowSignOutModal(false)}
      />
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

  content: { padding: 20, gap: 8 },

  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  avatarWrap: { marginBottom: 4 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  profileName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 24,
  },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 32 },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 44 },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginBottom: 4,
  },
});
