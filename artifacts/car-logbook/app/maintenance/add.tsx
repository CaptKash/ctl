import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiGet } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  licensePlate?: string | null;
};

export default function AddMaintenanceSelectCarScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const handleSelectCar = (car: Car) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/maintenance/form", params: { carId: String(car.id) } });
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Add Repair</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Instruction */}
      <View style={[styles.instruction, { backgroundColor: C.warningLight }]}>
        <Feather name="info" size={15} color={C.warning} />
        <Text style={[styles.instructionText, { color: C.warning }]}>
          Select the vehicle you want to log a repair for
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.warning} />
        </View>
      ) : !cars || cars.length === 0 ? (
        <View style={styles.center}>
          <Feather name="truck" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No vehicles yet</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            Add a car first before logging a repair.
          </Text>
          <Pressable
            onPress={() => router.replace("/car/add")}
            style={[styles.addCarBtn, { backgroundColor: C.warning }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addCarBtnText}>Add Car</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cars}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectCar(item)}
              style={({ pressed }) => [
                styles.carRow,
                { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={[styles.carIcon, { backgroundColor: C.warningLight }]}>
                <MaterialCommunityIcons name="car-side" size={26} color={C.warning} />
              </View>
              <View style={styles.carInfo}>
                <Text style={[styles.carName, { color: C.text }]}>
                  {item.year} {item.make} {item.model}
                </Text>
                {item.licensePlate && (
                  <View style={styles.plateRow}>
                    <Feather name="credit-card" size={11} color={C.textTertiary} />
                    <Text style={[styles.plate, { color: C.textSecondary }]}>
                      {item.licensePlate}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.goBtn, { backgroundColor: C.warning }]}>
                <Feather name="tool" size={15} color="#fff" />
              </View>
            </Pressable>
          )}
        />
      )}
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

  list: { padding: 16, gap: 12 },
  carRow: {
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
  carIcon: {
    width: 50,
    height: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  carInfo: { flex: 1, gap: 4 },
  carName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  plateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  plate: { fontSize: 13, fontFamily: "Inter_400Regular" },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
