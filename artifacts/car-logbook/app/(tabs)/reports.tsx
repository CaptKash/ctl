import { Feather } from "@expo/vector-icons";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  licensePlate?: string | null;
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: C.textSecondary }]}>Analysis</Text>
          <Text style={[styles.headerTitle, { color: C.text }]}>Reports</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : (
        <FlatList
          data={cars ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 100 },
          ]}
          ListHeaderComponent={
            cars && cars.length > 0 ? (
              <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
                Select a car to view its full report
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="bar-chart-2"
              title="No reports yet"
              description="Add a car first to generate maintenance, cost, and activity reports."
              actionLabel="Add Car"
              onAction={() => router.push("/car/add")}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/report/[id]", params: { id: String(item.id) } });
              }}
              style={({ pressed }) => [
                styles.reportCard,
                { backgroundColor: C.card, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: C.infoLight }]}>
                <Feather name="file-text" size={22} color={C.info} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.carName, { color: C.text }]}>
                  {item.year} {item.make} {item.model}
                </Text>
                {item.licensePlate && (
                  <Text style={[styles.plate, { color: C.textSecondary }]}>{item.licensePlate}</Text>
                )}
              </View>
              <Feather name="chevron-right" size={18} color={C.textTertiary} />
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerEyebrow: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 14,
  },
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  carName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  plate: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
