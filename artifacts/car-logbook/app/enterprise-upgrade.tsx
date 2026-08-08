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
import { PurchasesPackage } from "react-native-purchases";
import { errorMessage, isUserCancelled } from "@/lib/errors";

type Tier = "10" | "50" | "unlimited";
type Period = "monthly" | "annual";

const TIER_ORDER: Tier[] = ["10", "50", "unlimited"];

function tierOf(productId: string): Tier | null {
  if (productId.includes("_unlimited_")) return "unlimited";
  if (productId.includes("_50_")) return "50";
  if (productId.includes("_10_")) return "10";
  return null;
}

function periodOf(productId: string): Period | null {
  if (productId.endsWith("_monthly")) return "monthly";
  if (productId.endsWith("_annual")) return "annual";
  return null;
}

export default function EnterpriseUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const {
    isLoading,
    purchase,
    isPurchasing,
    restore,
    isRestoring,
    isEnterprise,
    usingMockPackages,
    offerings,
    mockEnterprisePackages,
  } = useSubscription();

  const [period, setPeriod] = React.useState<Period>("annual");
  const [selectedTier, setSelectedTier] = React.useState<Tier>("50");
  const [confirmPkg, setConfirmPkg] = React.useState<PurchasesPackage | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const realEnterprise = offerings?.all?.enterprise?.availablePackages ?? [];
  const packages: PurchasesPackage[] =
    usingMockPackages || realEnterprise.length === 0 ? mockEnterprisePackages : realEnterprise;

  // Index packages by tier + period from their product identifier.
  const byTierPeriod = React.useMemo(() => {
    const map: Record<Tier, Partial<Record<Period, PurchasesPackage>>> = {
      "10": {},
      "50": {},
      unlimited: {},
    };
    for (const pkg of packages) {
      const tier = tierOf(pkg.product.identifier);
      const per = periodOf(pkg.product.identifier);
      if (tier && per) map[tier][per] = pkg;
    }
    return map;
  }, [packages]);

  const TIER_META: Record<Tier, { label: string }> = {
    "10": { label: t("enterpriseUpgrade.seats10") },
    "50": { label: t("enterpriseUpgrade.seats50") },
    unlimited: { label: t("enterpriseUpgrade.seatsUnlimited") },
  };

  const selectedPkg = byTierPeriod[selectedTier]?.[period];

  const ENTERPRISE_FEATURES = [
    t("enterpriseUpgrade.feature1"),
    t("enterpriseUpgrade.feature2"),
    t("enterpriseUpgrade.feature3"),
  ];

  const handleSubscribe = async () => {
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
      // The subscriber becomes the owner/admin of a new org — send them to the
      // organization screen, which shows the create-org flow when none exists.
      router.replace("/organization");
    } catch (e) {
      if (!isUserCancelled(e)) {
        setError(errorMessage(e, t("enterpriseUpgrade.purchaseFailed")));
      }
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    try {
      await restore();
    } catch {
      setError(t("enterpriseUpgrade.restoreFailed"));
    }
  };

  if (isEnterprise) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background, alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <MetalIcon icon="check-circle" color="#312E81" bg="#E0E7FF" size={32} style={styles.heroIconWrap} />
        <Text style={[styles.heroTitle, { color: C.text, marginTop: 16 }]}>{t("enterpriseUpgrade.alreadyTitle")}</Text>
        <Text style={[styles.heroSub, { color: C.textSecondary, marginTop: 8 }]}>{t("enterpriseUpgrade.alreadySub")}</Text>
        <Pressable
          onPress={() => router.replace("/organization")}
          style={[styles.ctaBtn, { marginTop: 28, paddingHorizontal: 32 }]}
        >
          <Text style={styles.ctaBtnText}>{t("enterpriseUpgrade.manageOrg")}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={[styles.restoreText, { color: C.textSecondary }]}>{t("enterpriseUpgrade.back")}</Text>
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
          <MetalIcon icon="briefcase" color="#312E81" bg="#E0E7FF" size={28} style={styles.heroIconWrap} />
          <Text style={[styles.heroTitle, { color: C.text }]}>{t("enterpriseUpgrade.title")}</Text>
          <Text style={[styles.heroSub, { color: C.textSecondary }]}>{t("enterpriseUpgrade.tagline")}</Text>
        </View>

        <View style={[styles.featureCard, { backgroundColor: C.card }]}>
          {ENTERPRISE_FEATURES.map((f) => (
            <View key={f} style={[styles.featureRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Feather name="check-circle" size={15} color="#4338CA" />
              <Text style={[styles.featureText, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl", flex: 1 }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Billing period toggle */}
        <View style={[styles.segment, { backgroundColor: C.card }, isRTL && { flexDirection: "row-reverse" }]}>
          {(["monthly", "annual"] as Period[]).map((p) => {
            const active = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => {
                  setPeriod(p);
                  Haptics.selectionAsync();
                }}
                style={[styles.segmentBtn, active && { backgroundColor: "#4338CA" }]}
              >
                <Text style={[styles.segmentText, { color: active ? "#fff" : C.textSecondary }]}>
                  {p === "monthly" ? t("enterpriseUpgrade.billingMonthly") : t("enterpriseUpgrade.billingAnnual")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("enterpriseUpgrade.choosePlan")}</Text>

        {usingMockPackages && __DEV__ && (
          <View style={[styles.devNotice, { backgroundColor: "#EEF2FF" }]}>
            <Text style={[styles.devNoticeText, { color: "#3730A3" }]}>{t("enterpriseUpgrade.devNotice")}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={C.tint} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t("enterpriseUpgrade.loadingPlans")}</Text>
          </View>
        ) : (
          TIER_ORDER.map((tier) => {
            const pkg = byTierPeriod[tier]?.[period];
            const active = selectedTier === tier;
            const price = pkg?.product.priceString ?? "—";
            const periodSub = period === "monthly" ? t("enterpriseUpgrade.perMonth") : t("enterpriseUpgrade.perYear");
            // When real enterprise packages are loaded but this tier has no
            // matching product yet (not fully configured in RevenueCat), treat
            // the card as unavailable: grey it out and block selection so the
            // "—" price doesn't look like a display bug.
            const unavailable = !pkg && !usingMockPackages && realEnterprise.length > 0;
            return (
              <Pressable
                key={tier}
                onPress={() => {
                  if (unavailable) return;
                  setSelectedTier(tier);
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: C.card,
                    borderColor: active ? "#4338CA" : C.border,
                    borderWidth: active ? 2 : 1,
                    opacity: unavailable ? 0.4 : 1,
                  },
                  isRTL && { flexDirection: "row-reverse" },
                ]}
              >
                <View style={[styles.planRadio, { borderColor: active ? "#4338CA" : C.textTertiary }]}>
                  {active && <View style={styles.planRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{TIER_META[tier].label}</Text>
                  <Text style={[styles.planSub, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{periodSub}</Text>
                </View>
                <Text style={[styles.planPrice, { color: C.text }]}>{price}</Text>
              </Pressable>
            );
          })
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSubscribe}
          disabled={isPurchasing || isLoading || !selectedPkg}
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: isPurchasing || isLoading || !selectedPkg ? 0.45 : pressed ? 0.8 : 1 },
          ]}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>{t("enterpriseUpgrade.subscribe")}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleRestore}
          disabled={isRestoring}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "center" })}
        >
          <Text style={[styles.restoreText, { color: C.textSecondary }]}>
            {isRestoring ? t("enterpriseUpgrade.restoring") : t("enterpriseUpgrade.restorePurchases")}
          </Text>
        </Pressable>

        <Text style={[styles.legalText, { color: C.textTertiary }]}>
          {t("enterpriseUpgrade.legal")}{"\n"}
          <Text
            style={[styles.legalLink, { color: C.tint }]}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >{t("enterpriseUpgrade.privacy")}</Text>
          {"  ·  "}
          <Text
            style={[styles.legalLink, { color: C.tint }]}
            onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}
          >{t("enterpriseUpgrade.terms")}</Text>
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
            <Text style={[styles.modalTitle, { color: C.text }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>{t("enterpriseUpgrade.testTitle")}</Text>
            <Text style={[styles.modalBody, { color: C.textSecondary }, isRTL && { textAlign: "right", writingDirection: "rtl" }]}>
              {t("enterpriseUpgrade.testBody", {
                label: confirmPkg ? confirmPkg.product.title : "",
                price: confirmPkg?.product.priceString ?? "",
              })}
            </Text>
            <View style={[styles.modalActions, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable onPress={() => setConfirmPkg(null)} style={[styles.modalBtn, { backgroundColor: C.background }]}>
                <Text style={[styles.modalBtnText, { color: C.textSecondary }]}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const pkg = confirmPkg;
                  setConfirmPkg(null);
                  if (pkg) await executePurchase(pkg);
                }}
                style={[styles.modalBtn, { backgroundColor: "#4338CA" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{t("enterpriseUpgrade.confirmPurchase")}</Text>
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
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  featureCard: { borderRadius: 16, padding: 16, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  segment: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginTop: 4 },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", paddingVertical: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  devNotice: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  devNoticeText: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },

  planCard: {
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#4338CA" },
  planLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  planPrice: { fontSize: 17, fontFamily: "Inter_700Bold" },

  ctaBtn: {
    backgroundColor: "#4338CA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    minHeight: 52,
    justifyContent: "center",
  },
  ctaBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },

  restoreText: { fontSize: 13, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#DC2626", textAlign: "center" },

  legalText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  legalLink: { fontSize: 11, fontFamily: "Inter_500Medium" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { borderRadius: 20, padding: 24, width: "100%", gap: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
