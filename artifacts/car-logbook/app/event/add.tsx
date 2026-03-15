import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";

type EventOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  available: boolean;
};

const eventOptions: EventOption[] = [
  {
    id: "malfunction",
    title: "Fault",
    description: "Report a breakdown or fault",
    icon: "alert-triangle",
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    available: true,
  },
  {
    id: "maintenance",
    title: "Repair",
    description: "Log a service or repair",
    icon: "tool",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    available: true,
  },
  {
    id: "inspection",
    title: "Inspection",
    description: "Record a regular check or inspection",
    icon: "clipboard",
    iconBg: "#D1FAE5",
    iconColor: "#059669",
    available: true,
  },
  {
    id: "registration",
    title: "Registration",
    description: "Record a registration or renewal",
    icon: "file-text",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    available: false,
  },
];

export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleSelect = (option: EventOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!option.available) {
      Alert.alert("Coming Soon", `${option.title} logging will be available in a future update.`);
      return;
    }
    if (option.id === "malfunction") {
      router.push("/malfunction/add");
    } else if (option.id === "maintenance") {
      router.push("/maintenance/add");
    } else if (option.id === "inspection") {
      router.push("/inspection/add");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Add Event</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.instruction, { backgroundColor: C.infoLight }]}>
        <Feather name="info" size={15} color={C.info} />
        <Text style={[styles.instructionText, { color: C.info }]}>
          Choose the type of event to log
        </Text>
      </View>

      <View style={styles.list}>
        {eventOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => handleSelect(option)}
            style={({ pressed }) => [
              styles.optionRow,
              {
                backgroundColor: C.card,
                shadowColor: C.shadow,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
              <Feather name={option.icon} size={24} color={option.iconColor} />
            </View>
            <View style={styles.optionBody}>
              <Text style={[styles.optionTitle, { color: C.text }]}>{option.title}</Text>
              <Text style={[styles.optionDesc, { color: C.textSecondary }]}>
                {option.description}
              </Text>
            </View>
            {option.available ? (
              <View style={[styles.goBtn, { backgroundColor: C.tint }]}>
                <Feather name="chevron-right" size={16} color="#fff" />
              </View>
            ) : (
              <View style={[styles.comingSoonBadge, { backgroundColor: C.backgroundTertiary }]}>
                <Text style={[styles.comingSoonText, { color: C.textTertiary }]}>Soon</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },

  instruction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
  },
  instructionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },

  list: { flex: 1, padding: 16, gap: 12 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBody: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
