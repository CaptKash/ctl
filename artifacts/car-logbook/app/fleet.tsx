import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useOrg } from "@/context/OrgContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
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
  const C = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());
  const openRowId = useRef<number | null>(null);

  const { isFleet, FREE_CAR_LIMIT } = useSubscription();
  const { activeOrgId, isOrgContext, activeRole } = useOrg();

  // Cars resolve from the active context (org shared fleet vs personal).
  const carsQueryKey = activeOrgId ? ["orgs", activeOrgId, "cars"] : ["cars"];

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: carsQueryKey,
    queryFn: () =>
      activeOrgId ? apiGet<Car[]>(`/orgs/${activeOrgId}/cars`) : apiGet<Car[]>("/cars"),
  });

  // In an org, only admins may add or delete vehicles.
  const canManageCars = !isOrgContext || activeRole === "admin";

  const handleAddCar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    if (isOrgContext) {
      router.push("/car/add");
    } else if (!isFleet && (cars?.length ?? 0) >= FREE_CAR_LIMIT) {
      router.push("/fleet-upgrade");
    } else {
      router.push("/car/add");
    }
  };

  // Both personal and org cars delete through /cars/:carId — access is resolved
  // server-side (owner for personal; owner/admin for org via canMutateVehicle).
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/cars/${id}`),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: carsQueryKey });
      setIsEditing(false);
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await qc.refetchQueries({ queryKey: carsQueryKey });
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
      title: t("fleet.deleteTitle"),
      message: t("fleet.deleteMessage", { car: `${car.year} ${car.make} ${car.model}` }),
      confirmLabel: t("fleet.deleteConfirm"),
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
  }, [closeRow, deleteMutation, t]);

  const renderRightActions = useCallback(
    (car: Car) =>
      (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        if (!canManageCars) return null;
        const scale = dragX.interpolate({
          inputRange: [-100, -50, 0],
          outputRange: [1, 0.8, 0],
          extrapolate: "clamp",
        });

        return (
          <Pressable style={styles.deleteActionContainer} onPress={() => handleDelete(car)}>
            <Animated.View style={[styles.deleteAction, { transform: [{ scale }] }]}>
              <Feather name="trash-2" size={22} color="#fff" />
              <Text style={styles.deleteActionText}>{t("common.delete")}</Text>
            </Animated.View>
          </Pressable>
        );
      },
    [handleDelete, t, canManageCars]
  );

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <LinearGradient
            colors={["#FFFFFF", "#E2E8F0", "#94A3B8"]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.iconBox, { borderWidth: 1, borderColor: "#64748B", ...Platform.select({ ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2 } }) }]}
          >
            <Ionicons name="car" size={26} color="#334155" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t("fleet.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>{t("fleet.subtitle")}</Text>
          </View>
          {canManageCars && (
            <>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditing((v) => !v);
                }}
                style={[styles.addBtn, { backgroundColor: isEditing ? "#DC2626" : "rgba(220,38,38,0.12)" }]}
              >
                <Feather name="minus" size={20} color={isEditing ? "#fff" : "#DC2626"} />
              </Pressable>
              <Pressable
                onPress={handleAddCar}
                style={[styles.addBtn, { backgroundColor: C.tint }]}
              >
                <Feather name="plus" size={20} color="#fff" />
              </Pressable>
            </>
          )}
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
              ionIcon="car-outline"
              title={t("fleet.emptyTitle")}
              description={t("fleet.emptyDesc")}
              actionLabel={canManageCars ? t(isOrgContext ? "fleet.addVehicle" : "fleet.addCar") : undefined}
              onAction={canManageCars ? handleAddCar : undefined}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.rowWrapper}>
              {isEditing && (
                <Pressable
                  onPress={() => handleDelete(item)}
                  style={styles.deleteCircle}
                  hitSlop={6}
                >
                  <Feather name="minus" size={16} color="#fff" />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <Swipeable
                  renderRightActions={renderRightActions(item)}
                  onSwipeableWillOpen={() => { closePreviousRow(item.id); }}
                  ref={(ref) => {
                    if (ref) swipeableRefs.current.set(item.id, ref);
                    else swipeableRefs.current.delete(item.id);
                  }}
                  overshootRight={false}
                  friction={2}
                >
                  <CarCard
                    car={item}
                    accentBg="#DBEAFE"
                    accentIcon="#1A56DB"
                    onPress={() => {
                      if (isEditing) { handleDelete(item); return; }
                      Haptics.selectionAsync();
                      router.push({ pathname: "/car/[id]", params: { id: String(item.id) } });
                    }}
                    onLogEvent={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: "/event/add", params: { carId: String(item.id) } });
                    }}
                  />
                </Swipeable>
              </View>
            </View>
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
  rowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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
