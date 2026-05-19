import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
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
import { apiGet } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type Option = {
  id: "repair" | "inspection";
  titleKey: string;
  descKey: string;
  icon: keyof typeof Feather.glyphMap;
  gradient: readonly [string, string, string];
  border: string;
  iconColor: string;
  onPress: () => void;
};

export default function InspectionTypePickerScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId } = useLocalSearchParams<{ carId: string }>();

  const { data: car } = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
    enabled: Boolean(carId),
  });

  const carTitle = car
    ? car.nickname ?? `${car.year} ${car.make} ${car.model}`
    : "";

  const options: Option[] = [
    {
      id: "repair",
      titleKey: "inspection.options.repair",
      descKey: "inspection.descriptions.repair",
      icon: "tool",
      gradient: ["#FEF9C3", "#FDE047", "#CA8A04"],
      border: "#A16207",
      iconColor: "#713F12",
      onPress: () => {
        Haptics.selectionAsync();
        router.push({ pathname: "/maintenance/form", params: { carId } });
      },
    },
    {
      id: "inspection",
      titleKey: "inspection.options.inspection",
      descKey: "inspection.descriptions.inspection",
      icon: "clipboard",
      gradient: ["#FEF3C7", "#FCD34D", "#D97706"],
      border: "#92400E",
      iconColor: "#78350F",
      onPress: () => {
        Haptics.selectionAsync();
        router.push({ pathname: "/inspection/form", params: { carId } });
      },
    },
  ];

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#FEF3C7", "#FCD34D", "#D97706"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#92400E" }]}
          >
            <Feather name="clipboard" size={22} color="#78350F" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
              {t("inspection.titleSelect")}
            </Text>
            {carTitle ? (
              <Text
                style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={1}
              >
                {carTitle}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.prompt, { color: C.textSecondary }]}>
          {t("inspection.prompt")}
        </Text>

        <View style={styles.cards}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              onPress={option.onPress}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: C.card,
                  borderColor: option.border,
                  shadowColor: C.shadow,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <LinearGradient
                colors={option.gradient}
                locations={[0, 0.55, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[styles.cardIcon, { borderWidth: 1, borderColor: option.border }]}
              >
                <Feather name={option.icon} size={28} color={option.iconColor} />
              </LinearGradient>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t(option.titleKey)}</Text>
              <Text style={[styles.cardSub, { color: C.textSecondary }]}>
                {t(option.descKey)}
              </Text>
            </Pressable>
          ))}
        </View>
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
  body: {
    flex: 1,
    padding: 20,
    paddingTop: 28,
  },
  prompt: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  cards: { gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  cardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
  },
});
