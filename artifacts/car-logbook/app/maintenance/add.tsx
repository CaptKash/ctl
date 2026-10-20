import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { CarCard } from "@/components/ui/CarCard";
import { useCars } from "@/hooks/useCars";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
  photos?: string | null;
};

export default function AddRepairSelectCarScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t } = useTranslation();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: cars, isLoading } = useCars<Car>();

  const handleSelectCar = (car: Car) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/maintenance/form", params: { carId: String(car.id) } });
  };

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="tool" color="#D97706" bg="#FEF3C7" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t("maintenanceAdd.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>{t("maintenanceAdd.subtitle")}</Text>
          </View>
        </View>
      </View>


      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.warning} />
        </View>
      ) : !cars || cars.length === 0 ? (
        <View style={styles.center}>
          <Feather name="truck" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>{t("maintenanceAdd.emptyTitle")}</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            {t("maintenanceAdd.emptySub")}
          </Text>
          <Pressable
            onPress={() => router.replace("/car/add")}
            style={[styles.addCarBtn, { backgroundColor: C.warning }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addCarBtnText}>{t("maintenanceAdd.addCar")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {cars.map((car) => (
            <CarCard key={car.id} car={car} onPress={() => handleSelectCar(car)} accentBg="#FEF3C7" accentIcon="#D97706" />
          ))}
        </ScrollView>
      )}
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
  instruction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
  },
  instructionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  addCarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  addCarBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  list: { padding: 16 },
});
