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
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";

type EventOption = {
  id: "malfunction" | "inspection" | "registration";
  titleKey: string;
  icon: keyof typeof Feather.glyphMap;
  gradient: readonly [string, string, string];
  border: string;
  iconColor: string;
  available: boolean;
};

const eventOptions: EventOption[] = [
  {
    id: "malfunction",
    titleKey: "technicalLog.options.fault",
    icon: "alert-triangle",
    gradient: ["#FEE2E2", "#FCA5A5", "#DC2626"],
    border: "#991B1B",
    iconColor: "#7F1D1D",
    available: true,
  },
  {
    id: "inspection",
    titleKey: "technicalLog.options.inspection",
    icon: "clipboard",
    gradient: ["#FEF3C7", "#FCD34D", "#D97706"],
    border: "#92400E",
    iconColor: "#78350F",
    available: true,
  },
  {
    id: "registration",
    titleKey: "technicalLog.options.renewal",
    icon: "refresh-cw",
    gradient: ["#CCFBF1", "#5EEAD4", "#0D9488"],
    border: "#115E59",
    iconColor: "#134E4A",
    available: true,
  },
];

export default function AddEventScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId } = useLocalSearchParams<{ carId?: string }>();

  const handleSelect = (option: EventOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!option.available) {
      Alert.alert(
        t("technicalLog.comingSoonTitle"),
        t("technicalLog.comingSoonBody", { type: t(option.titleKey) }),
      );
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
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#EFF6FF", "#60A5FA", "#1E40AF"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#312E81" }]}
          >
            <Feather name="book-open" size={22} color="#312E81" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
              {t("technicalLog.title")}
            </Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("technicalLog.subtitle")}
            </Text>
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
              isRTL && { flexDirection: "row-reverse" },
              {
                backgroundColor: C.card,
                shadowColor: C.shadow,
                borderWidth: 1.5,
                borderColor: option.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={option.gradient}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[styles.optionIcon, { borderWidth: 1, borderColor: option.border }]}
            >
              <Feather name={option.icon} size={24} color={option.iconColor} />
            </LinearGradient>
            <View style={styles.optionBody}>
              <Text
                style={[styles.optionTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}
              >
                {t(option.titleKey)}
              </Text>
            </View>
            {option.available ? (
              <Feather
                name={isRTL ? "chevron-left" : "chevron-right"}
                size={20}
                color={C.textTertiary}
              />
            ) : (
              <View style={[styles.comingSoonBadge, { backgroundColor: C.backgroundTertiary }]}>
                <Text style={[styles.comingSoonText, { color: C.textTertiary }]}>
                  {t("technicalLog.soon")}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
      <BottomNav />
    </SwipeBackView>
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
