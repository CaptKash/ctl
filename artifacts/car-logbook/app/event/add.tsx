import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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
    title: "Fault / Breakdown / Damage",
    description: "",
    icon: "alert-triangle",
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    available: true,
  },
  {
    id: "inspection",
    title: "Repair / Inspection",
    description: "",
    icon: "clipboard",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    available: true,
  },
  {
    id: "registration",
    title: "License / Insurance Renewal",
    description: "",
    icon: "refresh-cw",
    iconBg: "#CCFBF1",
    iconColor: "#0D9488",
    available: true,
  },
];

export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId } = useLocalSearchParams<{ carId?: string }>();

  const handleSelect = (option: EventOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!option.available) {
      Alert.alert("Coming Soon", `${option.title} logging will be available in a future update.`);
      return;
    }
    const params = carId ? { carId } : {};
    if (option.id === "malfunction") {
      router.push({ pathname: "/malfunction/add", params });
    } else if (option.id === "inspection") {
      router.push({ pathname: "/inspection/add", params });
    } else if (option.id === "registration") {
      router.push({ pathname: "/renewal/add", params });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="plus-circle" size={22} color="#DC2626" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Log Event</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Select an event type</Text>
          </View>
        </View>
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
              {option.description ? (
                <Text style={[styles.optionDesc, { color: C.textSecondary }]}>
                  {option.description}
                </Text>
              ) : null}
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  backBtn: {},
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },

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
