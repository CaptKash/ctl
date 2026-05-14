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
import { useTranslation } from "react-i18next";
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
import { setLanguage, type SupportedLanguage } from "@/lib/i18n";

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
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.row, isRTL && { flexDirection: "row-reverse" }, { opacity: pressed && onPress ? 0.75 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: danger ? C.danger : C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.pill, { backgroundColor: danger ? C.dangerLight : C.tint + "18" }]}>
          <Text style={[styles.pillText, { color: danger ? C.danger : C.tint }]}>{badge}</Text>
        </View>
      ) : onPress ? (
        <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={C.textTertiary} />
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
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
      Alert.alert(
        t("settings.connected.couldntConnectTitle"),
        t("settings.connected.couldntConnectMessage", { provider: label }),
      );
    } finally {
      setPending(null);
    }
  };

  const disconnect = (account: NonNullable<typeof apple>, label: string) => {
    Alert.alert(
      t("settings.connected.disconnectTitle", { provider: label }),
      t("settings.connected.disconnectMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.connected.disconnectConfirm"),
          style: "destructive",
          onPress: async () => {
            if (pending) return;
            setPending(account.provider);
            try {
              await account.destroy();
              await user.reload();
            } catch {
              Alert.alert(
                t("settings.connected.couldntDisconnectTitle"),
                t("settings.connected.couldntDisconnectMessage"),
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
      ? account!.emailAddress || t("settings.connected.connected")
      : t("settings.connected.signInFasterWith", { provider: label });
    return (
      <Pressable
        onPress={() => {
          if (isPending) return;
          onPress();
        }}
        style={({ pressed }) => [styles.row, isRTL && { flexDirection: "row-reverse" }, { opacity: pressed && !isPending ? 0.75 : 1 }]}
      >
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{label}</Text>
          <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {isPending ? (
          <ActivityIndicator size="small" color={C.textSecondary} />
        ) : isConnected ? (
          <View style={[styles.pill, { backgroundColor: "#10B98118" }]}>
            <Text style={[styles.pillText, { color: "#059669" }]}>{t("settings.connected.connected")}</Text>
          </View>
        ) : (
          <View style={[styles.pill, { backgroundColor: C.tint + "18" }]}>
            <Text style={[styles.pillText, { color: C.tint }]}>{t("settings.connected.connect")}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <>
      <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.signInMethods")}</Text>
      <View style={[styles.card, { backgroundColor: C.card }]}>
        <Row
          icon="logo-apple"
          iconColor={C.text}
          iconBg={C.backgroundTertiary}
          label={t("settings.connected.apple")}
          account={apple}
          strategy="oauth_apple"
        />
        <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
        <Row
          icon="logo-google"
          iconColor="#1A1A1A"
          iconBg="#FFFFFF"
          label={t("settings.connected.google")}
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  return (
    <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{subtitle}</Text> : null}
      </View>
      {comingSoon ? (
        <View style={[styles.pill, { backgroundColor: C.tint + "18" }]}>
          <Text style={[styles.pillText, { color: C.tint }]}>{t("settings.toggle.soon")}</Text>
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

const THEME_VALUES: { value: ThemePreference; icon: React.ComponentProps<typeof Feather>["name"]; key: string }[] = [
  { value: "light", icon: "sun", key: "themeLight" },
  { value: "dark", icon: "moon", key: "themeDark" },
  { value: "system", icon: "smartphone", key: "themeSystem" },
];

const DISTANCE_OPTIONS: { value: "km" | "mi"; label: string }[] = [
  { value: "km", label: "km" },
  { value: "mi", label: "mi" },
];

function CountryRow() {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { country, setCountry } = useCountry();

  const handlePress = () => {
    registerPicker(
      t("settings.account.country"),
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
    <TouchableOpacity style={[styles.row, isRTL && { flexDirection: "row-reverse" }]} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: "#EDE9FE" }]}>
        <Feather name="globe" size={16} color="#7C3AED" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.account.country")}</Text>
        <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
          {country ? `${country.flag} ${country.name}` : t("settings.account.countryPlaceholder")}
        </Text>
      </View>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={C.textTertiary} />
    </TouchableOpacity>
  );
}

// Lets the user switch between English and Arabic. Uses the shared
// select-picker. When the writing direction flips (LTR↔RTL), the
// `setLanguage` helper auto-reloads the JS bundle so the layout
// re-mounts in the new direction — no user-facing alert needed.
function LanguageRow() {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const optionFor = (lng: SupportedLanguage) =>
    lng === "ar" ? t("settings.account.languageArabic") : t("settings.account.languageEnglish");
  const codeFor = (label: string): SupportedLanguage =>
    label === t("settings.account.languageArabic") ? "ar" : "en";

  const current = i18n.language === "ar" ? "ar" : "en";

  const handlePress = () => {
    registerPicker(
      t("settings.account.language"),
      [optionFor("en"), optionFor("ar")],
      optionFor(current),
      async (selected) => {
        const lng = codeFor(selected);
        if (lng === i18n.language) return;
        await setLanguage(lng);
      },
    );
    router.push("/select-picker");
  };

  return (
    <TouchableOpacity style={[styles.row, isRTL && { flexDirection: "row-reverse" }]} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: "#FCE7F3" }]}>
        <Feather name="message-circle" size={16} color="#DB2777" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.account.language")}</Text>
        <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{optionFor(current)}</Text>
      </View>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={C.textTertiary} />
    </TouchableOpacity>
  );
}

function CurrencyRow() {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { currency, setCurrency } = useCurrency();

  const handlePress = () => {
    registerPicker(
      t("settings.preferences.currency"),
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
    <TouchableOpacity style={[styles.row, isRTL && { flexDirection: "row-reverse" }]} onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: "#D1FAE5" }]}>
        <Feather name="dollar-sign" size={16} color="#059669" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.preferences.currency")}</Text>
        <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
          {currency.code} · {currency.name}
        </Text>
      </View>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={C.textTertiary} />
    </TouchableOpacity>
  );
}

function DistanceRow() {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { unit, setUnit } = useDistanceUnit();

  return (
    <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
      <View style={[styles.rowIcon, { backgroundColor: "#CFFAFE" }]}>
        <Feather name="navigation" size={16} color="#0891B2" />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.preferences.distanceUnit")}</Text>
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { preference, setPreference } = useTheme();

  return (
    <View style={[styles.row, { alignItems: "flex-start", flexDirection: "column", gap: 10 }]}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, alignSelf: "stretch" }}>
        <View style={[styles.rowIcon, { backgroundColor: "#FEF3C7" }]}>
          <Feather name="sun" size={16} color="#D97706" />
        </View>
        <Text style={[styles.rowTitle, { color: C.text, flex: 1 }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.preferences.theme")}</Text>
      </View>
      <View style={[styles.segmented, { backgroundColor: C.backgroundTertiary, borderColor: C.border, alignSelf: "stretch" }]}>
        {THEME_VALUES.map((opt) => {
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
                {t(`settings.preferences.${opt.key}`)}
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
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
          t("settings.notifications.disabledTitle"),
          t("settings.notifications.disabledMessage"),
          [{ text: t("common.ok") }]
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
    ? t("settings.vehicleCount.none")
    : cars.length === 1
      ? t("settings.vehicleCount.one", { label: cars[0].nickname ?? `${cars[0].year} ${cars[0].make}` })
      : t("settings.vehicleCount.many", { count: cars.length });

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={[styles.iconBox, { backgroundColor: C.backgroundTertiary }]}>
            <Feather name="settings" size={22} color={C.textSecondary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.subtitle")}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: C.card }, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={[styles.avatar, { backgroundColor: C.tint }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{user?.name ?? t("common.dash")}</Text>
            <Text style={[styles.profileEmail, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{user?.email ?? t("common.dash")}</Text>
          </View>
          <View style={[styles.statBubble, { backgroundColor: C.tint + "15" }]}>
            <Text style={[styles.statValue, { color: C.tint }]}>{cars.length}</Text>
            <Text style={[styles.statLabel, { color: C.tint }]}>{t("settings.carsLabel")}</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.account")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <NavRow
            icon="edit-2"
            iconColor="#2563EB"
            iconBg="#DBEAFE"
            label={t("settings.account.editProfile")}
            subtitle={t("settings.account.editProfileSub")}
            onPress={() => router.push("/edit-profile")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <CountryRow />
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <LanguageRow />
        </View>

        {/* Connected accounts (Clerk-only — legacy users only see this once
            they've migrated and have a Clerk session). */}
        <ConnectedAccountsCard />

        {/* Subscriptions */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.subscriptions")}</Text>

        {/* CTL Fleet upgrade card */}
        <Pressable
          style={({ pressed }) => [styles.fleetCard, { opacity: pressed ? 0.92 : 1 }]}
          onPress={() => router.push("/fleet-upgrade" as any)}
        >
          <View style={[styles.fleetHeader, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={styles.fleetIconWrap}>
              <Feather name="star" size={16} color="#92400E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fleetTitle, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.fleet.title")}</Text>
              <Text style={[styles.fleetTagline, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.fleet.tagline")}</Text>
            </View>
          </View>
          <View style={styles.fleetFeatures}>
            {[
              t("settings.fleet.feature1"),
              t("settings.fleet.feature2"),
              t("settings.fleet.feature3"),
              t("settings.fleet.feature4"),
              t("settings.fleet.feature5"),
            ].map((f) => (
              <View key={f} style={[styles.fleetFeatureRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name="check-circle" size={13} color="#D97706" />
                <Text style={[styles.fleetFeatureText, isRTL && { textAlign: "right", writingDirection: "rtl", flex: 1 }]}>{f}</Text>
              </View>
            ))}
            <View style={[styles.fleetCta, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.fleetCtaText}>{t("settings.fleet.cta")}</Text>
              <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={14} color="#78350F" />
            </View>
          </View>
        </Pressable>

        {/* CTL Enterprise upgrade card (placeholder — content TBD) */}
        <Pressable
          style={({ pressed }) => [styles.enterpriseCard, { opacity: pressed ? 0.92 : 1 }]}
          onPress={() =>
            Alert.alert(
              t("settings.enterprise.title"),
              t("settings.enterprise.tagline"),
              [{ text: t("common.ok") }],
            )
          }
        >
          <View style={[styles.fleetHeader, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={styles.enterpriseIconWrap}>
              <Feather name="briefcase" size={16} color="#312E81" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.enterpriseTitle, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.enterprise.title")}</Text>
              <Text style={[styles.enterpriseTagline, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.enterprise.tagline")}</Text>
            </View>
          </View>
          <View style={styles.fleetFeatures}>
            {[
              t("settings.enterprise.feature1"),
              t("settings.enterprise.feature2"),
              t("settings.enterprise.feature3"),
            ].map((f) => (
              <View key={f} style={[styles.fleetFeatureRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name="check-circle" size={13} color="#4338CA" />
                <Text style={[styles.enterpriseFeatureText, isRTL && { textAlign: "right", writingDirection: "rtl", flex: 1 }]}>{f}</Text>
              </View>
            ))}
            <View style={[styles.enterpriseCta, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.enterpriseCtaText}>{t("settings.enterprise.cta")}</Text>
              <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={14} color="#FFFFFF" />
            </View>
          </View>
        </Pressable>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.preferences")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <ThemeRow />
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <DistanceRow />
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <CurrencyRow />
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.notifications")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <ToggleRow
            icon="bell"
            iconColor="#D97706"
            iconBg="#FEF3C7"
            label={t("settings.notifications.eventReminders")}
            subtitle={t("settings.notifications.eventRemindersSub")}
            value={remindersEnabled}
            onChange={handleRemindersToggle}
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.about")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={[styles.rowIcon, { backgroundColor: C.backgroundTertiary }]}>
              <Feather name="info" size={16} color={C.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("settings.about.appVersion")}</Text>
              <Text style={[styles.rowSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("common.version")}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <NavRow
            icon="message-square"
            iconColor="#7C3AED"
            iconBg="#EDE9FE"
            label={t("settings.about.feedback")}
            subtitle={t("settings.about.feedbackSub")}
            onPress={() => router.push("/feedback")}
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <NavRow
            icon="lock"
            iconColor="#6B7280"
            iconBg="#F3F4F6"
            label={t("settings.about.privacy")}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          />
        </View>

        {/* Sign out + danger */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl", marginRight: 4, marginLeft: 0 }]}>{t("settings.sections.session")}</Text>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <NavRow
            icon="log-out"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            label={t("settings.session.signOut")}
            subtitle={t("settings.session.signOutSub")}
            onPress={() => setShowSignOutModal(true)}
            danger
          />
          <View style={[styles.divider, { backgroundColor: C.borderLight }, isRTL && { marginLeft: 0, marginRight: 44 }]} />
          <NavRow
            icon="trash-2"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            label={t("settings.session.deleteAccount")}
            subtitle={t("settings.session.deleteAccountSub")}
            onPress={() => setShowDeleteModal(true)}
            danger
          />
        </View>

        <Text style={[styles.version, { color: C.textTertiary }]}>{t("common.version")}</Text>
      </ScrollView>

      <BottomNav active="settings" />

      <ConfirmModal
        visible={showSignOutModal}
        title={t("settings.modals.signOutTitle")}
        message={t("settings.modals.signOutMessage")}
        confirmLabel={t("settings.modals.signOutConfirm")}
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
        title={t("settings.modals.deleteTitle")}
        message={t("settings.modals.deleteMessage")}
        confirmLabel={deleteLoading ? t("settings.modals.deleting") : t("settings.modals.deleteConfirm")}
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
  fleetCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FCD34D",
  },
  fleetCtaText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#78350F" },

  enterpriseCard: {
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#A5B4FC",
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
  },
  enterpriseIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  enterpriseTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#312E81" },
  enterpriseTagline: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#4338CA", marginTop: 1 },
  enterpriseFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#312E81" },
  enterpriseCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
  },
  enterpriseCtaText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
