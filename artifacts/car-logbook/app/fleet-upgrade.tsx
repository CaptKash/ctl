import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useSubscription } from "@/lib/revenuecat";

const PRIVACY_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/privacy`
  : "https://ctl-car-technical-log.replit.app/privacy";
import { localizeDigits } from "@/lib/i18n";
import { PurchasesPackage } from "react-native-purchases";
import { errorMessage, isUserCancelled } from "@/lib/errors";

const PACKAGE_ORDER = ["$rc_monthly", "$rc_annual", "$rc_lifetime"];

export default function FleetUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const FREE_FEATURES = [
    t("fleetUpgrade.freeFeature1"),
    t("fleetUpgrade.freeFeature2"),
    t("fleetUpgrade.freeFeature3"),
    t("fleetUpgrade.freeFeature4"),
    t("fleetUpgrade.freeFeature5"),
  ];

  const FLEET_FEATURES = [
    { icon: "layers" as const, label: t("fleetUpgrade.fleetFeature1") },
    { icon: "dollar-sign" as const, label: t("fleetUpgrade.fleetFeature3") },
    { icon: "download" as const, label: t("fleetUpgrade.fleetFeature4") },
    { icon: "star" as const, label: t("fleetUpgrade.fleetFeature5") },
  ];

  const PACKAGE_META: Record<string, { label: string; sub: string; highlight: boolean }> = {
    "$rc_monthly": { label: t("fleetUpgrade.monthlyLabel"), sub: t("fleetUpgrade.perMonth"), highlight: false },
    "$rc_annual": { label: t("fleetUpgrade.annualLabel"), sub: t("fleetUpgrade.perYearSave", { percent: localizeDigits(44, i18n.language) }), highlight: false },
    "$rc_lifetime": { label: t("fleetUpgrade.lifetimeLabel"), sub: t("fleetUpgrade.oneTime"), highlight: true },
  };

  const { isLoading, purchase, isPurchasing, restore, isRestoring, isFleet, offeringsFailed, usingMockPackages, refetchOfferings, mockPackages, realPackages, diagnostics, offeringsError } = useSubscription();
  const [selectedId, setSelectedId] = React.useState("$rc_lifetime");
  const [confirmPkg, setConfirmPkg] = React.useState<PurchasesPackage | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const availablePackages: PurchasesPackage[] = usingMockPackages ? mockPackages : realPackages;

  const orderedPackages = PACKAGE_ORDER
    .map((id) => availablePackages.find((p) => p.identifier === id))
    .filter(Boolean) as PurchasesPackage[];

  const selectedPkg = orderedPackages.find((p) => p.identifier === selectedId) ?? orderedPackages[0];

  const handleGetFleet = async () => {
    if (!selectedPkg) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    if (__DEV__) {
      setConfirmPkg(selectedPkg);
    } else {
      await executePurchase(selectedPkg);
    }
  };

  const executePurchase = async (pkg: PurchasesPackage) => {
    try {
      await purchase(pkg);
      router.back();
    } catch (e) {
      if (!isUserCancelled(e)) {
        setError(errorMessage(e, t("fleetUpgrade.purchaseFailed")));
      }
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    try {
      await restore();
    } catch {
      setError(t("fleetUpgrade.restoreFailed"));
    }
  };

  if (isFleet) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background, alignItems: "center", justifyContent: "center" }]}>
        <MetalIcon icon="check-circle" color="#D97706" bg="#FEF3C7" size={32} style={styles.heroIconWrap} />
        <Text style={[styles.heroTitle, { color: C.text, marginTop: 16 }]}>{t("fleetUpgrade.alreadyTitle")}</Text>
        <Text style={[styles.heroSub, { color: C.textSecondary, marginTop: 8 }]}>
          {t("fleetUpgrade.alreadySub")}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.ctaBtn, { marginTop: 32, paddingHorizontal: 32 }]}
        >
          <Text style={styles.ctaBtnText}>{t("fleetUpgrade.back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: C.card, alignSelf: isRTL ? "flex-start" : "flex-end" }]}
          hitSlop={8}
        >
          <Feather name="x" size={18} color={C.textSecondary} />
        </Pressable>

        <View style={styles.hero}>
          <MetalIcon icon="star" color="#92400E" bg="#FEF3C7" size={28} style={styles.heroIconWrap} />
          <Text style={[styles.heroTitle, { color: C.text }]}>{t("fleetUpgrade.ctlFleetTitle")}</Text>
          <Text style={[styles.heroSub, { color: C.textSecondary }]}>
            {t("fleetUpgrade.tagline")}
          </Text>
        </View>

        <View style={[styles.comparisonCard, { backgroundColor: C.card }, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={styles.comparisonCol}>
            <Text style={[styles.comparisonHeader, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("fleetUpgrade.freeHeader")}</Text>
            {FREE_FEATURES.map((f) => (
              <View key={f} style={[styles.comparisonRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name="check" size={13} color={C.textTertiary} />
                <Text style={[styles.comparisonText, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.dividerV, { backgroundColor: C.border }]} />
          <View style={styles.comparisonCol}>
            <Text style={[styles.comparisonHeader, { color: "#D97706" }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("fleetUpgrade.fleetHeader")}</Text>
            {FLEET_FEATURES.map((f) => (
              <View key={f.label} style={[styles.comparisonRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name="check-circle" size={13} color="#D97706" />
                <Text style={[styles.comparisonText, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("fleetUpgrade.choosePlan")}</Text>

        {usingMockPackages && __DEV__ && (
          <View style={[styles.devNotice, { backgroundColor: "#FEF3C7" }]}>
            <Text style={styles.devNoticeText}>{t("fleetUpgrade.devNotice")}</Text>
          </View>
        )}

        {usingMockPackages && !__DEV__ && (
          <View style={[styles.devNotice, { backgroundColor: C.card }]}>
            <Text style={[styles.devNoticeText, { color: C.textSecondary }]}>
              {t("fleetUpgrade.connectingStore")}{" "}
              <Text onPress={() => refetchOfferings()} style={{ color: C.tint }}>{t("fleetUpgrade.retry")}</Text>
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={C.tint} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t("fleetUpgrade.loadingPlans")}</Text>
          </View>
        ) : (
          orderedPackages.map((pkg) => {
            const meta = PACKAGE_META[pkg.identifier] ?? { label: pkg.identifier, sub: "", highlight: false };
            const active = selectedId === pkg.identifier;
            const price = pkg.product.priceString;
            const sub = meta.sub;
            return (
              <Pressable
                key={pkg.identifier}
                onPress={() => {
                  setSelectedId(pkg.identifier);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: C.card,
                    borderColor: active ? "#D97706" : C.border,
                    borderWidth: active ? 2 : 1,
                    paddingTop: meta.highlight ? 26 : 16,
                  },
                  isRTL && { flexDirection: "row-reverse" },
                ]}
              >
                {meta.highlight && (
                  <View style={[styles.popularBadge, isRTL && { right: "auto", left: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 10 }]}>
                    <Text style={styles.popularText}>{t("fleetUpgrade.bestValue")}</Text>
                  </View>
                )}
                <View style={[styles.planRadio, { borderColor: active ? "#D97706" : C.textTertiary }]}>
                  {active && <View style={styles.planRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{meta.label}</Text>
                  <Text style={[styles.planSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{sub}</Text>
                </View>
                <Text style={[styles.planPrice, { color: C.text }]}>{price}</Text>
              </Pressable>
            );
          })
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {offeringsError && !__DEV__ && (
          <View style={[styles.devNotice, { backgroundColor: "#FEF2F2", marginTop: 4 }]}>
            <Text style={[styles.devNoticeText, { color: "#991B1B", fontSize: 11 }]} selectable>
              {t("fleetUpgrade.storeError", { msg: offeringsError })}
            </Text>
            {diagnostics && (
              <Text style={[styles.devNoticeText, { color: "#6B7280", fontSize: 10, marginTop: 2 }]} selectable>
                {diagnostics}
              </Text>
            )}
          </View>
        )}

        <Pressable
          onPress={handleGetFleet}
          disabled={isPurchasing || isLoading || orderedPackages.length === 0}
          style={({ pressed }) => [
            styles.ctaBtn,
            {
              opacity: (isPurchasing || isLoading || orderedPackages.length === 0)
                ? 0.45
                : pressed ? 0.8 : 1,
            },
          ]}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>{t("fleetUpgrade.getCtlFleet")}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleRestore}
          disabled={isRestoring}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "center" })}
        >
          <Text style={[styles.restoreText, { color: C.textSecondary }]}>
            {isRestoring ? t("fleetUpgrade.restoring") : t("fleetUpgrade.restorePurchases")}
          </Text>
        </Pressable>

        <Text style={[styles.legalText, { color: C.textTertiary }]}>
          {t("fleetUpgrade.legal")}{"\n"}
          <Text
            style={[styles.legalLink, { color: C.tint }]}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >{t("fleetUpgrade.privacy")}</Text>
          {"  ·  "}
          <Text
            style={[styles.legalLink, { color: C.tint }]}
            onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}
          >{t("fleetUpgrade.terms")}</Text>
        </Text>
      </ScrollView>

      {/* Test mode confirmation modal */}
      <Modal
        visible={!!confirmPkg}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmPkg(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("fleetUpgrade.testTitle")}</Text>
            <Text style={[styles.modalBody, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
              {t("fleetUpgrade.testBody", {
                label: confirmPkg ? (PACKAGE_META[confirmPkg.identifier]?.label ?? confirmPkg.identifier) : "",
                price: confirmPkg?.product.priceString ?? "",
              })}
            </Text>
            <View style={[styles.modalActions, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable
                onPress={() => setConfirmPkg(null)}
                style={[styles.modalBtn, { backgroundColor: C.background }]}
              >
                <Text style={[styles.modalBtnText, { color: C.textSecondary }]}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const pkg = confirmPkg;
                  setConfirmPkg(null);
                  if (pkg) await executePurchase(pkg);
                }}
                style={[styles.modalBtn, { backgroundColor: "#D97706" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{t("fleetUpgrade.confirmPurchase")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },

  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  hero: { alignItems: "center", gap: 8, marginBottom: 4 },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  comparisonCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  comparisonCol: { flex: 1, gap: 8 },
  comparisonHeader: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 2 },
  comparisonRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  comparisonText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  dividerV: { width: StyleSheet.hairlineWidth },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 4,
  },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  devNotice: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  devNoticeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#92400E",
    textAlign: "center",
  },

  planCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  popularText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D97706",
  },
  planLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  planPrice: { fontSize: 17, fontFamily: "Inter_700Bold" },

  ctaBtn: {
    backgroundColor: "#D97706",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    minHeight: 52,
    justifyContent: "center",
  },
  ctaBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },

  restoreText: { fontSize: 13, fontFamily: "Inter_400Regular", paddingVertical: 4 },

  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    textAlign: "center",
  },

  legalText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  legalLink: { fontSize: 11, fontFamily: "Inter_500Medium" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
