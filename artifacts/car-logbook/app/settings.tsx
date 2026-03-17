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

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null };

const C = Colors.light;

function NavRow({
  icon,
  iconColor,
  iconBg,
  label,
  subtitle,
  onPress,
  badge,
  danger,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  badge?: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.row, { opacity: pressed && onPress ? 0.75 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: danger ? C.danger : C.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: C.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.pill, { backgroundColor: danger ? "#FEE2E2" : C.tint + "18" }]}>
          <Text style={[styles.pillText, { color: danger ? C.danger : C.tint }]}>{badge}</Text>
        </View>
      ) : onPress ? (
        <Feather name="chevron-right" size={16} color={C.textTertiary} />
      ) : null}
    </Pressable>
  );
}

function ToggleRow({
  icon,
  iconColor,
  iconBg,
  label,
  subtitle,
  value,
  onChange,
  comingSoon,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  comingSoon?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: C.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {comingSoon ? (
        <View style={[styles.pill, { backgroundColor: C.tint + "18" }]}>
          <Text style={[styles.pillText, { color: C.tint }]}>Soon</Text>
        </View>
      ) : (
        <Switch
          value={value}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            onChange(v);
          }}
          trackColor={{ true: C.tint, false: C.border }}
          thumbColor="#fff"
        />
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { user, logout, biometricAvailable, biometricEnrolled, enableBiometric, disableBiometric } = useAuth();
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [distanceKm, setDistanceKm] = useState(true);
  const [eventReminders, setEventReminders] = useState(false);
  const [licenseAlerts, setLicenseAlerts] = useState(false);

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

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const fleetLabel = cars.length === 0
    ? "No vehicles registered"
    : cars.length === 1
      ? `1 vehicle · ${cars[0].nickname ?? `${cars[0].year} ${cars[0].make}`}`
      : `${cars.length} vehicles registered`;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="settings" size={22} color="#6B7280" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Account & preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: C.card }]}>
          <View style={[styles.avatar, { backgroundColor: C.tint }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: C.text }]}>{user?.name ?? "—"}</Text>
            <Text style={[styles.profileEmail, { color: C.textSecondary }]}>{user?.email ?? "—"}</Text>
          </View>
          <View style={[styles.statBubble, { backgroundColor: C.tint + "15" }]}>
            <Text style={[styles.statValue, { color: C.tint }]}>{cars.length}</Text>
            <Text style={[styles.statLabel, { color: C.tint }]}>cars</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <NavRow
            icon="edit-2"
            iconColor="#2563EB"
            iconBg="#DBEAFE"
            label="Edit Profile"
            subtitle="Update name or email"
            badge="Soon"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="truck"
            iconColor="#7C3AED"
            iconBg="#EDE9FE"
            label="My Fleet"
            subtitle={fleetLabel}
            onPress={() => router.push("/fleet")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="plus-circle"
            iconColor="#059669"
            iconBg="#D1FAE5"
            label="Add New Vehicle"
            subtitle="Register a car, bike or van"
            onPress={() => router.push("/car/add")}
          />
        </View>

        {/* Records */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>RECORDS</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <NavRow
            icon="file-text"
            iconColor="#059669"
            iconBg="#D1FAE5"
            label="Generate Report"
            subtitle="Export faults & repair history"
            onPress={() => router.push("/report")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="clock"
            iconColor="#D97706"
            iconBg="#FEF3C7"
            label="Repair History"
            subtitle="Browse all logged maintenance"
            onPress={() => router.push("/repair-history")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="alert-triangle"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            label="Fault Log"
            subtitle="View all reported faults"
            onPress={() => router.push("/faults")}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <ToggleRow
            icon="navigation"
            iconColor="#0891B2"
            iconBg="#CFFAFE"
            label="Distance Unit"
            subtitle={distanceKm ? "Kilometres (km)" : "Miles (mi)"}
            value={distanceKm}
            onChange={setDistanceKm}
          />
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <ToggleRow
            icon="bell"
            iconColor="#D97706"
            iconBg="#FEF3C7"
            label="Upcoming Event Reminders"
            subtitle="Alerts before service due dates"
            value={eventReminders}
            onChange={setEventReminders}
            comingSoon
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <ToggleRow
            icon="shield"
            iconColor="#EF4444"
            iconBg="#FEE2E2"
            label="License & Insurance Alerts"
            subtitle="Reminders before expiry dates"
            value={licenseAlerts}
            onChange={setLicenseAlerts}
            comingSoon
          />
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
                    {biometricEnrolled ? "Face ID or fingerprint enabled" : "Use Face ID or fingerprint"}
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
            </View>
          </>
        )}

        {/* About */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: "#F3F4F6" }]}>
              <Feather name="info" size={16} color="#6B7280" />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: C.text }]}>App Version</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }]}>CTL v1.0.0</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="message-square"
            iconColor="#7C3AED"
            iconBg="#EDE9FE"
            label="Send Feedback"
            subtitle="Help us improve CTL"
            badge="Soon"
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="lock"
            iconColor="#6B7280"
            iconBg="#F3F4F6"
            label="Privacy Policy"
            badge="Soon"
          />
        </View>

        {/* Sign out + danger */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>SESSION</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <NavRow
            icon="log-out"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            label="Sign Out"
            subtitle="You'll need to log in again"
            onPress={() => setShowSignOutModal(true)}
            danger
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="trash-2"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            label="Delete Account"
            subtitle="Permanently erase all data"
            badge="Soon"
            danger
          />
        </View>

        <Text style={[styles.version, { color: C.textTertiary }]}>CTL v1.0.0</Text>
      </ScrollView>

      <BottomNav active="settings" />

      <ConfirmModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of CTL?"
        confirmLabel="Sign Out"
        onConfirm={async () => {
          setShowSignOutModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
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
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statBubble: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },

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
