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
import Colors from "@/constants/colors";
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

export default function InspectionTypePickerScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId } = useLocalSearchParams<{ carId: string }>();

  const { data: car } = useQuery<Car>({
    queryKey: ["car", carId],
    queryFn: () => apiGet<Car>(`/cars/${carId}`),
    enabled: Boolean(carId),
  });

  const carTitle = car
    ? car.nickname ?? `${car.year} ${car.make} ${car.model}`
    : "Vehicle";

  const handleRepair = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/maintenance/form", params: { carId } });
  };

  const handleInspection = () => {
    Haptics.selectionAsync();
    router.push({ pathname: "/inspection/form", params: { carId } });
  };

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="check-square" size={22} color="#D97706" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Log Repair / Inspection</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]} numberOfLines={1}>
              {carTitle}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.prompt, { color: C.textSecondary }]}>
          What would you like to log?
        </Text>

        <View style={styles.cards}>
          <Pressable
            onPress={handleRepair}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.cardIcon, { backgroundColor: "#FEF9C3" }]}>
              <Feather name="tool" size={30} color="#CA8A04" />
            </View>
            <Text style={[styles.cardTitle, { color: C.text }]}>Repair</Text>
            <Text style={[styles.cardSub, { color: C.textSecondary }]}>
              Log a vehicle repair or maintenance service
            </Text>
          </Pressable>

          <Pressable
            onPress={handleInspection}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.cardIcon, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="clipboard" size={30} color="#D97706" />
            </View>
            <Text style={[styles.cardTitle, { color: C.text }]}>Inspection</Text>
            <Text style={[styles.cardSub, { color: C.textSecondary }]}>
              Log a formal vehicle inspection or roadworthiness check
            </Text>
          </Pressable>
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
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
