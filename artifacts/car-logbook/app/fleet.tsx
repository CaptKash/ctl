import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { CarCard } from "@/components/ui/CarCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiDelete } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
  photos?: string | null;
};

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/cars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars"] }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.refetchQueries({ queryKey: ["cars"] });
    setRefreshing(false);
  };

  const handleDelete = (car: Car) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Remove Car",
      `Remove ${car.year} ${car.make} ${car.model} from your logbook?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteMutation.mutate(car.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>My Fleet</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/car/add");
          }}
          style={[styles.addBtn, { backgroundColor: C.tint }]}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
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
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="truck"
              title="No cars yet"
              description="Add your first car to start logging maintenance, fuel, insurance, and more."
              actionLabel="Add Car"
              onAction={() => router.push("/car/add")}
            />
          }
          renderItem={({ item }) => (
            <CarCard
              car={item}
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/car/[id]", params: { id: String(item.id) } });
              }}
              onLongPress={() => handleDelete(item)}
            />
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, paddingTop: 16 },
});
