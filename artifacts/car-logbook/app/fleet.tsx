import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { CarCard } from "@/components/ui/CarCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiDelete } from "@/hooks/useApi";

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

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  const openRowId = useRef<number | null>(null);

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/cars/${id}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["cars"] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.refetchQueries({ queryKey: ["cars"] });
    setRefreshing(false);
  };

  const closeRow = useCallback((carId: number) => {
    const ref = swipeableRefs.current.get(carId);
    if (ref) ref.close();
    if (openRowId.current === carId) openRowId.current = null;
  }, []);

  const closePreviousRow = useCallback((nextId: number) => {
    if (openRowId.current !== null && openRowId.current !== nextId) {
      closeRow(openRowId.current);
    }
    openRowId.current = nextId;
  }, [closeRow]);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({ visible: false, title: "", message: "", confirmLabel: "", onConfirm: () => {}, onCancel: () => {} });

  const handleDelete = useCallback((car: Car) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmModal({
      visible: true,
      title: "Delete Car",
      message: `This will permanently delete ${car.year} ${car.make} ${car.model} and ALL associated records — maintenance, fuel, parts, insurance, dealerships, and malfunctions.\n\nThis cannot be undone.`,
      confirmLabel: "Delete Everything",
      onConfirm: () => {
        setConfirmModal((s) => ({ ...s, visible: false }));
        closeRow(car.id);
        deleteMutation.mutate(car.id);
      },
      onCancel: () => {
        setConfirmModal((s) => ({ ...s, visible: false }));
        closeRow(car.id);
      },
    });
  }, [closeRow, deleteMutation]);

  const renderRightActions = useCallback(
    (car: Car) =>
      (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const scale = dragX.interpolate({
          inputRange: [-100, -50, 0],
          outputRange: [1, 0.8, 0],
          extrapolate: "clamp",
        });

        return (
          <Pressable style={styles.deleteActionContainer} onPress={() => handleDelete(car)}>
            <Animated.View style={[styles.deleteAction, { transform: [{ scale }] }]}>
              <Feather name="trash-2" size={22} color="#fff" />
              <Text style={styles.deleteActionText}>Delete</Text>
            </Animated.View>
          </Pressable>
        );
      },
    [handleDelete]
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="car-outline" size={26} color={C.tint} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>My Fleet</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>All vehicles</Text>
          </View>
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
            <Swipeable
              renderRightActions={renderRightActions(item)}
              onSwipeableWillOpen={() => {
                closePreviousRow(item.id);
              }}
              ref={(ref) => {
                if (ref) {
                  swipeableRefs.current.set(item.id, ref);
                } else {
                  swipeableRefs.current.delete(item.id);
                }
              }}
              overshootRight={false}
              friction={2}
            >
              <CarCard
                car={item}
                accentBg="#DBEAFE"
                accentIcon="#1A56DB"
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: "/car/[id]", params: { id: String(item.id) } });
                }}
                onLogEvent={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/event/add", params: { carId: String(item.id) } });
                }}
              />
            </Swipeable>
          )}
        />
      )}

      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmStyle="destructive"
        onConfirm={confirmModal.onConfirm}
        onCancel={confirmModal.onCancel}
      />
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
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  backBtn: {},
  headerTitle: {
    fontSize: 22,
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
  deleteActionContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteAction: {
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    height: "100%",
    borderRadius: 16,
    gap: 4,
  },
  deleteActionText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
