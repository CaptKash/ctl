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
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";

type SettingRow = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  subtitle?: string;
  iconColor?: string;
  iconBg?: string;
  comingSoon?: boolean;
};

const SECTIONS: { title: string; rows: SettingRow[] }[] = [
  {
    title: "Vehicles",
    rows: [
      {
        icon: "truck",
        label: "Manage Fleet",
        subtitle: "Add, edit or remove vehicles",
        iconColor: "#1A56DB",
        iconBg: "#DBEAFE",
      },
    ],
  },
  {
    title: "Notifications",
    rows: [
      {
        icon: "bell",
        label: "Upcoming Event Reminders",
        subtitle: "Get alerts before service due dates",
        iconColor: "#D97706",
        iconBg: "#FEF3C7",
        comingSoon: true,
      },
      {
        icon: "alert-circle",
        label: "License & Insurance Alerts",
        subtitle: "Reminders before expiry dates",
        iconColor: "#EF4444",
        iconBg: "#FEE2E2",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Data",
    rows: [
      {
        icon: "download",
        label: "Export Data",
        subtitle: "Download all records as PDF or CSV",
        iconColor: "#059669",
        iconBg: "#D1FAE5",
        comingSoon: true,
      },
      {
        icon: "trash-2",
        label: "Delete Account",
        subtitle: "Permanently remove your account and data",
        iconColor: "#EF4444",
        iconBg: "#FEE2E2",
        comingSoon: true,
      },
    ],
  },
  {
    title: "About",
    rows: [
      {
        icon: "info",
        label: "App Version",
        subtitle: "CTL v1.0.0",
        iconColor: "#6B7280",
        iconBg: "#F3F4F6",
      },
    ],
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="settings" size={22} color="#6B7280" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>App preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              {section.rows.map((row, i) => (
                <View key={row.label}>
                  {i > 0 && (
                    <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
                  )}
                  <View style={styles.row}>
                    <View
                      style={[
                        styles.rowIconWrap,
                        { backgroundColor: row.iconBg ?? C.backgroundTertiary },
                      ]}
                    >
                      <Feather
                        name={row.icon}
                        size={16}
                        color={row.iconColor ?? C.textSecondary}
                      />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, { color: C.text }]}>{row.label}</Text>
                      {row.subtitle && (
                        <Text style={[styles.rowSub, { color: C.textSecondary }]}>
                          {row.subtitle}
                        </Text>
                      )}
                    </View>
                    {row.comingSoon ? (
                      <View style={[styles.badge, { backgroundColor: C.tint + "15" }]}>
                        <Text style={[styles.badgeText, { color: C.tint }]}>Soon</Text>
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={16} color={C.textTertiary} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <BottomNav active="settings" />
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
  content: {
    padding: 20,
    gap: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  rowIconWrap: {
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
