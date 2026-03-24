import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Tools</Text>
        <Text style={[styles.headerSub, { color: C.textSecondary }]}>
          Utilities for your vehicle
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.tool,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: 0.7 },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="droplet" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text }]}>
              Fuel Consumption
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary }]}>
              Track &amp; monitor fuel usage
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <View
          style={[
            styles.tool,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: 0.7 },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="tool" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text }]}>
              Service Cost Tracker
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary }]}>
              Analyse spending over time
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <View
          style={[
            styles.tool,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: 0.7 },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="bar-chart-2" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text }]}>
              Mileage Log
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary }]}>
              Record and chart mileage
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>
      </ScrollView>

      <BottomNav active="tools" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 24 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 80,
  },
  toolIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBody: { flex: 1, gap: 3 },
  toolTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  toolSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  comingSoonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
  },
});
