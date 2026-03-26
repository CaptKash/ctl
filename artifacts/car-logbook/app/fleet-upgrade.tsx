import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";

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

const PLANS = [
  { id: "monthly", label: "Monthly", price: "$2.99", sub: "per month", highlight: false },
  { id: "annual", label: "Annual", price: "$24.99", sub: "per year · save 30%", highlight: false },
  { id: "lifetime", label: "Lifetime", price: "$19.99", sub: "one-time payment", highlight: true },
];

export default function FleetUpgradeScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const [selected, setSelected] = React.useState("lifetime");

  const handlePurchase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: C.card }]}
          hitSlop={8}
        >
          <Feather name="x" size={18} color={C.textSecondary} />
        </Pressable>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Feather name="star" size={28} color="#92400E" />
          </View>
          <Text style={[styles.heroTitle, { color: C.text }]}>CTL Fleet</Text>
          <Text style={[styles.heroSub, { color: C.textSecondary }]}>
            Manage every vehicle without limits
          </Text>
        </View>

        {/* Comparison */}
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

        {/* Plans */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>CHOOSE A PLAN</Text>
        {PLANS.map((plan) => {
          const active = selected === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => {
                setSelected(plan.id);
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
              {plan.highlight && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Best Value</Text>
                </View>
              )}
              <View style={[styles.planRadio, { borderColor: active ? "#D97706" : C.textTertiary }]}>
                {active && <View style={styles.planRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planLabel, { color: C.text }]}>{plan.label}</Text>
                <Text style={[styles.planSub, { color: C.textSecondary }]}>{plan.sub}</Text>
              </View>
              <Text style={[styles.planPrice, { color: C.text }]}>{plan.price}</Text>
            </Pressable>
          );
        })}

        {/* CTA */}
        <Pressable
          onPress={handlePurchase}
          style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.ctaBtnText}>Get CTL Fleet</Text>
          <Text style={styles.ctaBtnSub}>Payments coming soon</Text>
        </Pressable>

        <Text style={[styles.legalText, { color: C.textTertiary }]}>
          Subscription auto-renews. Cancel anytime in App Store settings.
        </Text>
      </ScrollView>
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
    gap: 2,
  },
  ctaBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  ctaBtnSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },

  legalText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
