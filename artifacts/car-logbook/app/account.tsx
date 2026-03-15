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

type PlanId = "free" | "pro" | "fleet";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
  accentColor: string;
  accentLight: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1 vehicle",
      "Up to 50 records",
      "Fault & repair logging",
      "Basic dashboard",
    ],
    accentColor: "#6B7280",
    accentLight: "#F3F4F6",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    period: "/ month",
    badge: "Most Popular",
    features: [
      "Up to 5 vehicles",
      "Unlimited records",
      "All event types",
      "PDF report export",
      "Upcoming event reminders",
    ],
    accentColor: "#2563EB",
    accentLight: "#DBEAFE",
  },
  {
    id: "fleet",
    name: "Fleet",
    price: "$12.99",
    period: "/ month",
    features: [
      "Unlimited vehicles",
      "Everything in Pro",
      "Advanced analytics",
      "Multi-user access",
      "Priority support",
    ],
    accentColor: "#7C3AED",
    accentLight: "#EDE9FE",
  },
];

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
  const [currentPlan] = useState<PlanId>("free");

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

  const handleSelectPlan = (plan: Plan) => {
    if (plan.id === currentPlan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Upgrade to ${plan.name}`,
      `${plan.price}${plan.period === "forever" ? "" : " " + plan.period}\n\nPayment integration coming soon.`,
      [{ text: "OK" }]
    );
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Account</Text>
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
          <View style={[styles.planBadge, { backgroundColor: "#F3F4F6" }]}>
            <Text style={[styles.planBadgeText, { color: "#6B7280" }]}>Free</Text>
          </View>
        </View>

        {/* Subscription */}
        <View>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Subscription</Text>
          <Text style={[styles.sectionSub, { color: C.textSecondary }]}>
            Choose a plan that fits your needs
          </Text>

          <View style={styles.plansRow}>
            {PLANS.map((plan) => {
              const isActive = plan.id === currentPlan;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => handleSelectPlan(plan)}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      backgroundColor: C.card,
                      borderColor: isActive ? plan.accentColor : C.border,
                      borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  {plan.badge && (
                    <View style={[styles.popularBadge, { backgroundColor: plan.accentColor }]}>
                      <Text style={styles.popularBadgeText}>{plan.badge}</Text>
                    </View>
                  )}

                  <View style={[styles.planIconWrap, { backgroundColor: plan.accentLight }]}>
                    <Feather
                      name={plan.id === "free" ? "box" : plan.id === "pro" ? "zap" : "layers"}
                      size={20}
                      color={plan.accentColor}
                    />
                  </View>

                  <Text style={[styles.planName, { color: C.text }]}>{plan.name}</Text>

                  <View style={styles.priceRow}>
                    <Text style={[styles.planPrice, { color: plan.accentColor }]}>{plan.price}</Text>
                    <Text style={[styles.planPeriod, { color: C.textTertiary }]}>{plan.period}</Text>
                  </View>

                  <View style={styles.featureList}>
                    {plan.features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <Feather name="check" size={12} color={plan.accentColor} />
                        <Text style={[styles.featureText, { color: C.textSecondary }]}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {isActive ? (
                    <View style={[styles.planBtn, { backgroundColor: plan.accentLight }]}>
                      <Text style={[styles.planBtnText, { color: plan.accentColor }]}>Current Plan</Text>
                    </View>
                  ) : (
                    <View style={[styles.planBtn, { backgroundColor: plan.accentColor }]}>
                      <Text style={[styles.planBtnText, { color: "#fff" }]}>
                        {plan.id === "free" ? "Downgrade" : "Upgrade"}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
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
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },

  plansRow: {
    flexDirection: "row",
    gap: 10,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    overflow: "visible",
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    left: "15%",
    right: "15%",
    borderRadius: 6,
    paddingVertical: 3,
    alignItems: "center",
  },
  popularBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  planIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  planName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  planPrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  planPeriod: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  featureList: {
    gap: 5,
    flex: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  featureText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  planBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 4,
  },
  planBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

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
