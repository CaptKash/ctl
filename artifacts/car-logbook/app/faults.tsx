import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dateUtils";
import { apiDelete, apiGet } from "@/hooks/useApi";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type FaultRecord = {
  id: number;
  carId: number;
  date: string;
  description: string;
  severity?: string | null;
  completed: boolean;
  car: Car | null;
};

const FAULT_BG = "#FEE2E2";
const FAULT_COLOR = "#DC2626";

const carLabel = (car: Car | null) => {
  if (!car) return "Unknown Car";
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
};

export default function FaultLogScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qc = useQueryClient();

  const { data: faults, isLoading } = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ carId, id }: { carId: number; id: number }) =>
      apiDelete(`/cars/${carId}/malfunctions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["malfunctions-all"] }),
  });

  const confirmDelete = (item: FaultRecord) => {
    Alert.alert("Delete Fault", "Remove this fault log permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate({ carId: item.carId, id: item.id }),
      },
    ]);
  };

  const sorted = React.useMemo(() => {
    if (!faults) return [];
    return [...faults].sort((a, b) => b.date.localeCompare(a.date));
  }, [faults]);

  const active = sorted.filter((f) => !f.completed);
  const openCount = active.length;
  const totalCount = sorted.length;

  const renderCard = ({ item }: { item: FaultRecord }) => {
    const car = carLabel(item.car);
    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: FAULT_COLOR }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.faultBadge, { backgroundColor: FAULT_BG }]}>
            <Feather name="alert-triangle" size={11} color={FAULT_COLOR} />
            <Text style={[styles.badgeText, { color: FAULT_COLOR }]}>Fault</Text>
          </View>
          <Text style={[styles.carName, { color: C.textTertiary }]} numberOfLines={1}>{car}</Text>
        </View>

        <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Feather name="calendar" size={12} color={C.textTertiary} />
            <Text style={[styles.footerText, { color: C.textTertiary }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.footerActions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/maintenance/form",
                  params: {
                    carId: String(item.carId),
                    faultDescription: item.description,
                    faultId: String(item.id),
                  },
                } as any)
              }
              style={[styles.fixBtn, { backgroundColor: FAULT_BG, borderColor: FAULT_COLOR }]}
            >
              <Feather name="tool" size={14} color={FAULT_COLOR} />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item)}
              style={[styles.fixBtn, { backgroundColor: FAULT_BG, borderColor: FAULT_COLOR }]}
            >
              <Feather name="trash-2" size={14} color={FAULT_COLOR} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="alert-triangle" size={22} color="#DC2626" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Fault Log</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {totalCount === 0 ? "No faults logged" : `${openCount} open · ${totalCount} total`}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#DC2626" />
        </View>
      ) : totalCount === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon="check-circle"
            title="No faults logged"
            subtitle="Fault records across all your cars will appear here."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {active.length === 0 ? (
            <View style={[styles.emptyActive, { backgroundColor: C.card, borderColor: C.border }]}>
              <Feather name="check-circle" size={20} color="#059669" />
              <Text style={[styles.emptyActiveText, { color: C.textSecondary }]}>All faults resolved</Text>
            </View>
          ) : (
            active.map((item) => (
              <View key={item.id} style={{ marginBottom: 10 }}>
                {renderCard({ item })}
              </View>
            ))
          )}

          <Pressable
            onPress={() => router.push("/malfunction/add" as any)}
            style={[styles.logBtn, { borderColor: "#DC2626" }]}
          >
            <Feather name="plus" size={15} color="#DC2626" />
            <Text style={[styles.logBtnText, { color: "#DC2626" }]}>Log Another Fault</Text>
          </Pressable>
        </ScrollView>
      )}

      <BottomNav active="faults" />
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
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  logBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16 },

  card: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  carName: { fontSize: 11, fontFamily: "Inter_500Medium", flexShrink: 1, textAlign: "right" },
  faultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, flexWrap: "wrap" },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footerActions: { flexDirection: "row", gap: 8 },
  fixBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyActiveText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
