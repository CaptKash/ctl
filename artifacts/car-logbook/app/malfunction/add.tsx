import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { CarCard } from "@/components/ui/CarCard";
import { apiGet } from "@/hooks/useApi";

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

export default function AddFaultSelectCarScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { carId: preselectedCarId } = useLocalSearchParams<{ carId?: string }>();

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  useEffect(() => {
    if (preselectedCarId && cars) {
      const car = cars.find((c) => String(c.id) === preselectedCarId);
      if (car) {
        router.replace({
          pathname: "/malfunction/log",
          params: { carId: String(car.id), carName: `${car.year} ${car.make} ${car.model}` },
        });
      }
    }
  }, [preselectedCarId, cars]);

  const handleSelectCar = (car: Car) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/malfunction/log",
      params: { carId: String(car.id), carName: `${car.year} ${car.make} ${car.model}` },
    });
  };

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#FEE2E2", "#FCA5A5", "#DC2626"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#991B1B" }]}
          >
            <Feather name="alert-triangle" size={22} color="#7F1D1D" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
              {t("malfunction.title")}
            </Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("malfunction.selectCar")}
            </Text>
          </View>
        </View>
      </View>


      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.danger} />
        </View>
      ) : !cars || cars.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={44} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>{t("malfunction.emptyTitle")}</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            {t("malfunction.emptySub")}
          </Text>
          <Pressable
            onPress={() => router.replace("/car/add")}
            style={[styles.addCarBtn, { backgroundColor: C.tint }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addCarBtnText}>{t("malfunction.addCar")}</Text>
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
            <CarCard key={car.id} car={car} onPress={() => handleSelectCar(car)} accentBg="#FEE2E2" accentIcon="#DC2626" />
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
