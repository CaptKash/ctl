import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ExpoLinking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-expo";
import BottomNav from "@/components/ui/BottomNav";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { useColors, useTheme, ThemePreference } from "@/context/ThemeContext";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { useCurrency, CURRENCIES, currencyOption, findCurrencyByOption } from "@/context/CurrencyContext";
import { useEventReminders } from "@/context/EventRemindersContext";
import { useCountry, COUNTRIES, countryOption, findCountryByOption } from "@/context/CountryContext";
import { registerPicker } from "@/components/ui/selectPickerStore";
import { requestNotificationPermissions } from "@/lib/notifications";
import { apiGet, apiDelete } from "@/hooks/useApi";

const PRIVACY_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/privacy`
  : "/privacy";

type Car = { id: number; make: string; model: string; year: number; nickname?: string | null };

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
  const C = useColors();
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
        <View style={[styles.pill, { backgroundColor: danger ? C.dangerLight : C.tint + "18" }]}>
          <Text style={[styles.pillText, { color: danger ? C.danger : C.tint }]}>{badge}</Text>
        </View>
      ) : onPress ? (
        <Feather name="chevron-right" size={16} color={C.textTertiary} />
      ) : null}
    </Pressable>
  );
}

// Lets a signed-in Clerk user link / unlink Apple & Google to their
// existing account. Uses Clerk's createExternalAccount → opens the
// returned verification URL in the OS-managed auth browser → reloads
// the user to refresh the externalAccounts list. Hidden for legacy
// users who haven't been migrated into Clerk yet (they have no Clerk
// `user` object). Disconnecting the last sign-in method falls through
// to Clerk's own server-side guard, which surfaces an error we show.
function ConnectedAccountsCard() {
  const C = useColors();
  const { user, isLoaded } = useUser();
  const [pending, setPending] = useState<string | null>(null);

  if (!isLoaded || !user) return null;

  const accounts = user.externalAccounts ?? [];
  const apple = accounts.find((a) => a.provider === "apple");
  const google = accounts.find((a) => a.provider === "google");

  const connect = async (strategy: "oauth_apple" | "oauth_google", label: string) => {
    if (!user || pending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending(strategy);
    try {
      const redirectUrl = ExpoLinking.createURL("/settings");
      const externalAccount = await user.createExternalAccount({ strategy, redirectUrl });
      const verifyUrl = externalAccount.verification?.externalVerificationRedirectURL?.toString();
      if (verifyUrl) {
        const result = await WebBrowser.openAuthSessionAsync(verifyUrl, redirectUrl);
        if (result.type === "success") {
          await user.reload();
        }
      }
    } catch {
      Alert.alert("Couldn't connect", `We couldn't link your ${label} account. Please try again.`);
    } finally {
      setPending(null);
    }
  };

  const disconnect = (account: NonNullable<typeof apple>, label: string) => {
    Alert.alert(
      `Disconnect ${label}?`,
      `You'll need another sign-in method (email/password or your other linked account) to sign in next time.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            if (pending) return;
            setPending(account.provider);
            try {
              await account.destroy();
              await user.reload();
            } catch {
              Alert.alert(
                "Couldn't disconnect",
                "Make sure you still have at least one other way to sign in, then try again.",
              );
            } finally {
              setPending(null);
            }
          },
        },
      ],
    );
  };

  const Row = ({
    icon,
    iconColor,
    iconBg,
    label,
    account,
    strategy,
  }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    iconColor: string;
    iconBg: string;
    label: string;
    account: typeof apple;
    strategy: "oauth_apple" | "oauth_google";
  }) => {
    const isConnected = !!account;
    const isPending = pending === strategy || (account && pending === account.provider);
    const onPress = isConnected
      ? () => disconnect(account!, label)
      : () => connect(strategy, label);
    const subtitle = isConnected
      ? account!.emailAddress || "Connected"
      : `Sign in faster with ${label}`;
    return (
      <Pressable
        onPress={() => {
          if (isPending) return;
          onPress();
        }}
        style={({ pressed }) => [styles.row, { opacity: pressed && !isPending ? 0.75 : 1 }]}
      >
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: C.text }]}>{label}</Text>
          <Text style={[styles.rowSub, { color: C.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {isPending ? (
          <ActivityIndicator size="small" color={C.textSecondary} />
        ) : isConnected ? (
          <View style={[styles.pill, { backgroundColor: "#10B98118" }]}>
            <Text style={[styles.pillText, { color: "#059669" }]}>Connected</Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: C.tint + "18" }]}>
            <Text style={[styles.pillText, { color: C.tint }]}>Connect</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>SIGN-IN METHODS</Text>
      <View style={[styles.card, { backgroundColor: C.card }]}>
        <Row
          icon="logo-apple"
          iconColor={C.text}
          iconBg={C.backgroundTertiary}
          label="Apple"
          account={apple}
          strategy="oauth_apple"
        />
        <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
        <Row
          icon="logo-google"
          iconColor="#1A1A1A"
          iconBg="#FFFFFF"
          label="Google"
          account={google}
          strategy="oauth_google"
        />
      </View>
    </>
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
  const C = useColors();
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

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "smartphone" },
];

const DISTANCE_OPTIONS: { value: "km" | "mi"; label: string }[] = [
  { value: "km", label: "km" },
  { value: "mi", label: "mi" },
];

function CountryRow() {
  const C = useColors();
  const { country, setCountry } = useCountry();

  const handlePress = () => {
    registerPicker(
      "Country",
      COUNTRIES.map(countryOption),
      country ? countryOption(country) : "",
      (selected) => {
        const found = findCountryByOption(selected);
        if (found) setCountry(found);
      }
    );
    router.push("/select-picker");
  };

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: "#EDE9FE" }]}>
        <Feather name="globe" size={16} color="#7C3AED" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }]}>Country</Text>
        <Text style={[styles.rowSub, { color: C.textSecondary }]}>
          {country ? `${country.flag} ${country.name}` : "Select your country"}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={C.textTertiary} />
    </TouchableOpacity>
  );
}

function CurrencyRow() {
  const C = useColors();
  const { currency, setCurrency } = useCurrency();

  const handlePress = () => {
    registerPicker(
      "Currency",
      CURRENCIES.map(currencyOption),
      currencyOption(currency),
      (selected) => {
        const found = findCurrencyByOption(selected);
        if (found) setCurrency(found);
      }
    );
    router.push("/select-picker");
  };

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: "#D1FAE5" }]}>
        <Feather name="dollar-sign" size={16} color="#059669" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }]}>Currency</Text>
        <Text style={[styles.rowSub, { color: C.textSecondary }]}>
          {currency.code} · {currency.name}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={C.textTertiary} />
    </TouchableOpacity>
  );
}

function DistanceRow() {
  const C = useColors();
  const { unit, setUnit } = useDistanceUnit();

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: "#CFFAFE" }]}>
        <Feather name="navigation" size={16} color="#0891B2" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }]}>Distance Unit</Text>
      </View>
      <View style={[styles.segmented, { backgroundColor: C.backgroundTertiary, borderColor: C.border }]}>
        {DISTANCE_OPTIONS.map((opt) => {
          const active = unit === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                Haptics.selectionAsync();
                setUnit(opt.value);
              }}
              style={[styles.segmentBtn, active && { backgroundColor: C.tint }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, { color: active ? "#fff" : C.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ThemeRow() {
  const C = useColors();
  const { preference, setPreference } = useTheme();

  return (
    <View style={[styles.row, { alignItems: "flex-start", flexDirection: "column", gap: 10 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[styles.rowIcon, { backgroundColor: "#FEF3C7" }]}>
          <Feather name="sun" size={16} color="#D97706" />
        </View>
        <Text style={[styles.rowTitle, { color: C.text }]}>Theme</Text>
      </View>
      <View style={[styles.segmented, { backgroundColor: C.backgroundTertiary, borderColor: C.border, alignSelf: "stretch" }]}>
        {THEME_OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                Haptics.selectionAsync();
                setPreference(opt.value);
              }}
              style={[
                styles.segmentBtn,
                { flex: 1, justifyContent: "center" },
                active && { backgroundColor: C.tint },
              ]}
              activeOpacity={0.7}
            >
              <Feather name={opt.icon} size={13} color={active ? "#fff" : C.textSecondary} />
              <Text style={[styles.segmentText, { color: active ? "#fff" : C.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { user, logout } = useAuth();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { enabled: remindersEnabled, setEnabled: setRemindersEnabled } = useEventReminders();

  const handleRemindersToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Notifications Disabled",
          "To receive service reminders, enable notifications for CTL in your device Settings.",
          [{ text: "OK" }]
        );
        return;
      }
    }
    setRemindersEnabled(value);
  };

  const { data: cars = [] } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
    staleTime: 30_000,
  });

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
          <View style={[styles.iconBox, { backgroundColor: C.backgroundTertiary }]}>
            <Feather name="settings" size={22} color={C.textSecondary} />
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
            onPress={() => router.push("/edit-profile")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <CountryRow />
        </View>

        {/* Connected accounts (Clerk-only — legacy users only see this once
            they've migrated and have a Clerk session). */}
        <ConnectedAccountsCard />

        {/* CTL Fleet upgrade card */}
        <Pressable
          style={({ pressed }) => [styles.fleetCard, { opacity: pressed ? 0.92 : 1 }]}
          onPress={() => router.push("/fleet-upgrade" as any)}
        >
          <View style={styles.fleetHeader}>
            <View style={styles.fleetIconWrap}>
              <Feather name="star" size={16} color="#92400E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fleetTitle}>CTL Fleet</Text>
              <Text style={styles.fleetTagline}>Manage every vehicle without limits</Text>
            </View>
          </View>
          <View style={styles.fleetFeatures}>
            {[
              "Unlimited vehicles",
              "Fuel Consumption analytics",
              "Service Cost Tracker",
              "PDF & CSV export",
              "All current & future tools",
            ].map((f) => (
              <View key={f} style={styles.fleetFeatureRow}>
                <Feather name="check-circle" size={13} color="#D97706" />
                <Text style={styles.fleetFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <ThemeRow />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <DistanceRow />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <CurrencyRow />
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <ToggleRow
            icon="bell"
            iconColor="#D97706"
            iconBg="#FEF3C7"
            label="Upcoming Event Reminders"
            subtitle="30d, 7d and 1d before due dates"
            value={remindersEnabled}
            onChange={handleRemindersToggle}
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: C.backgroundTertiary }]}>
              <Feather name="info" size={16} color={C.textSecondary} />
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
            onPress={() => router.push("/feedback")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
          <NavRow
            icon="lock"
            iconColor="#6B7280"
            iconBg="#F3F4F6"
            label="Privacy Policy"
            onPress={() => Linking.openURL(PRIVACY_URL)}
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
            onPress={() => setShowDeleteModal(true)}
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
          router.replace("/(tabs)");
        }}
        onCancel={() => setShowSignOutModal(false)}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Account"
        message="This will permanently delete your account, all your vehicles, and every record associated with them. This cannot be undone."
        confirmLabel={deleteLoading ? "Deleting…" : "Delete Everything"}
        confirmStyle="destructive"
        onConfirm={async () => {
          if (deleteLoading) return;
          setDeleteLoading(true);
          try {
            await apiDelete("/auth/account");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await logout();
            router.replace("/(tabs)");
          } catch {
            setDeleteLoading(false);
            setShowDeleteModal(false);
          }
        }}
        onCancel={() => { if (!deleteLoading) setShowDeleteModal(false); }}
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
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  version: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginBottom: 4,
  },

  segmented: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  segmentText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  fleetCard: {
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    overflow: "hidden",
    marginBottom: 4,
  },
  fleetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  fleetIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fleetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#78350F" },
  fleetTagline: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#B45309", marginTop: 1 },
  fleetBadge: { backgroundColor: "#FDE68A", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  fleetBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#92400E" },
  fleetFeatures: { paddingHorizontal: 16, paddingBottom: 14, gap: 7 },
  fleetFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fleetFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#78350F" },
});
