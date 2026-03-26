import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";
import { useSubscription } from "@/lib/revenuecat";
import { PurchasesPackage } from "react-native-purchases";

const FREE_FEATURES = [
  "Up to 2 vehicles",
  "Full maintenance logging",
  "Service Centers Nearby",
  "Basic reminders",
];

const FLEET_FEATURES = [
  { icon: "layers" as const, label: "Unlimited vehicles" },
  { icon: "bar-chart-2" as const, label: "Fuel Consumption analytics" },
  { icon: "dollar-sign" as const, label: "Service Cost Tracker" },
  { icon: "download" as const, label: "PDF & CSV export" },
  { icon: "star" as const, label: "All current & future tools" },
  { icon: "bell" as const, label: "Priority reminders" },
];

const PACKAGE_ORDER = ["$rc_monthly", "$rc_annual", "$rc_lifetime"];
const PACKAGE_META: Record<string, { label: string; sub: string; highlight: boolean }> = {
  "$rc_monthly": { label: "Monthly", sub: "per month", highlight: false },
  "$rc_annual": { label: "Annual", sub: "per year · save 30%", highlight: false },
  "$rc_lifetime": { label: "Lifetime", sub: "one-time payment", highlight: true },
};

export default function FleetUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const { offerings, isLoading, purchase, isPurchasing, restore, isRestoring, isFleet } = useSubscription();
  const [selectedId, setSelectedId] = React.useState("$rc_lifetime");
  const [confirmPkg, setConfirmPkg] = React.useState<PurchasesPackage | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const availablePackages: PurchasesPackage[] = offerings?.current?.availablePackages ?? [];

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
    } catch (e: any) {
      if (!e.userCancelled) {
        setError(e.message ?? "Purchase failed. Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    try {
      await restore();
    } catch (e: any) {
      setError("Restore failed. Please try again.");
    }
  };

  if (isFleet) {
    return (
      <View style={[styles.screen, { backgroundColor: C.background, alignItems: "center", justifyContent: "center" }]}>
        <View style={styles.heroIconWrap}>
          <Feather name="check-circle" size={32} color="#D97706" />
        </View>
        <Text style={[styles.heroTitle, { color: C.text, marginTop: 16 }]}>You're on CTL Fleet!</Text>
        <Text style={[styles.heroSub, { color: C.textSecondary, marginTop: 8 }]}>
          Enjoy unlimited vehicles and all premium tools.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.ctaBtn, { marginTop: 32 }]}
        >
          <Text style={styles.ctaBtnText}>Back</Text>
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
          style={[styles.closeBtn, { backgroundColor: C.card }]}
          hitSlop={8}
        >
          <Feather name="x" size={18} color={C.textSecondary} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Feather name="star" size={28} color="#92400E" />
          </View>
          <Text style={[styles.heroTitle, { color: C.text }]}>CTL Fleet</Text>
          <Text style={[styles.heroSub, { color: C.textSecondary }]}>
            Manage every vehicle without limits
          </Text>
        </View>

        <View style={[styles.comparisonCard, { backgroundColor: C.card }]}>
          <View style={styles.comparisonCol}>
            <Text style={[styles.comparisonHeader, { color: C.textSecondary }]}>Free</Text>
            {FREE_FEATURES.map((f) => (
              <View key={f} style={styles.comparisonRow}>
                <Feather name="check" size={13} color={C.textTertiary} />
                <Text style={[styles.comparisonText, { color: C.textSecondary }]}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.dividerV, { backgroundColor: C.border }]} />
          <View style={styles.comparisonCol}>
            <Text style={[styles.comparisonHeader, { color: "#D97706" }]}>Fleet</Text>
            {FLEET_FEATURES.map((f) => (
              <View key={f.label} style={styles.comparisonRow}>
                <Feather name="check-circle" size={13} color="#D97706" />
                <Text style={[styles.comparisonText, { color: C.text }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>CHOOSE A PLAN</Text>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={C.tint} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading plans...</Text>
          </View>
        ) : orderedPackages.length === 0 ? (
          <Text style={[styles.loadingText, { color: C.textSecondary, textAlign: "center" }]}>
            Plans unavailable. Please try again later.
          </Text>
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
                  },
                ]}
              >
                {meta.highlight && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Best Value</Text>
                  </View>
                )}
                <View style={[styles.planRadio, { borderColor: active ? "#D97706" : C.textTertiary }]}>
                  {active && <View style={styles.planRadioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planLabel, { color: C.text }]}>{meta.label}</Text>
                  <Text style={[styles.planSub, { color: C.textSecondary }]}>{sub}</Text>
                </View>
                <Text style={[styles.planPrice, { color: C.text }]}>{price}</Text>
              </Pressable>
            );
          })
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Pressable
          onPress={handleGetFleet}
          disabled={isPurchasing || isLoading || orderedPackages.length === 0}
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: pressed || isPurchasing ? 0.75 : 1 },
          ]}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>Get CTL Fleet</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleRestore}
          disabled={isRestoring}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: "center" })}
        >
          <Text style={[styles.restoreText, { color: C.textSecondary }]}>
            {isRestoring ? "Restoring..." : "Restore Purchases"}
          </Text>
        </Pressable>

        <Text style={[styles.legalText, { color: C.textTertiary }]}>
          Subscriptions auto-renew. Cancel anytime in App Store / Play Store settings.
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
            <Text style={[styles.modalTitle, { color: C.text }]}>Test Purchase</Text>
            <Text style={[styles.modalBody, { color: C.textSecondary }]}>
              You are in development mode. This will simulate purchasing{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: C.text }}>
                {confirmPkg ? (PACKAGE_META[confirmPkg.identifier]?.label ?? confirmPkg.identifier) : ""}
              </Text>{" "}
              for{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: C.text }}>
                {confirmPkg?.product.priceString}
              </Text>{" "}
              using the RevenueCat test store.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirmPkg(null)}
                style={[styles.modalBtn, { backgroundColor: C.background }]}
              >
                <Text style={[styles.modalBtnText, { color: C.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const pkg = confirmPkg;
                  setConfirmPkg(null);
                  if (pkg) await executePurchase(pkg);
                }}
                style={[styles.modalBtn, { backgroundColor: "#D97706" }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Confirm Purchase</Text>
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

  legalText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },

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
