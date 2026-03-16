import { Feather } from "@expo/vector-icons";
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
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import BottomNav from "@/components/ui/BottomNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";

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

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  major: 1,
  minor: 2,
  cosmetic: 3,
};

const SEVERITY_META: Record<string, { label: string; bg: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  critical: { label: "Critical",  bg: "#FEE2E2", color: "#DC2626", icon: "alert-octagon" },
  major:    { label: "Major",     bg: "#FEF3C7", color: "#D97706", icon: "alert-triangle" },
  minor:    { label: "Minor",     bg: "#DBEAFE", color: "#2563EB", icon: "info" },
  cosmetic: { label: "Cosmetic",  bg: "#F5EFE6", color: "#92400E", icon: "eye" },
};

const carLabel = (car: Car | null) => {
  if (!car) return "Unknown Car";
  return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
};

export default function FaultLogScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: faults, isLoading } = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const sorted = React.useMemo(() => {
    if (!faults) return [];
    return [...faults].sort((a, b) => {
      const sa = SEVERITY_ORDER[a.severity ?? ""] ?? 99;
      const sb = SEVERITY_ORDER[b.severity ?? ""] ?? 99;
      if (sa !== sb) return sa - sb;
      return b.date.localeCompare(a.date);
    });
  }, [faults]);

  const totalCount = sorted.length;
  const openCount = sorted.filter((f) => !f.completed).length;

  const renderCard = ({ item }: { item: FaultRecord }) => {
    const sev = item.severity ? SEVERITY_META[item.severity] : null;
    const car = carLabel(item.car);

    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: sev?.color ?? C.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {sev ? (
              <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                <Feather name={sev.icon} size={11} color={sev.color} />
                <Text style={[styles.severityText, { color: sev.color }]}>{sev.label}</Text>
              </View>
            ) : (
              <View style={[styles.severityBadge, { backgroundColor: C.backgroundTertiary }]}>
                <Text style={[styles.severityText, { color: C.textTertiary }]}>Unknown</Text>
              </View>
            )}
            {item.completed && (
              <View style={[styles.resolvedBadge, { backgroundColor: "#D1FAE5" }]}>
                <Feather name="check" size={11} color="#059669" />
                <Text style={[styles.severityText, { color: "#059669" }]}>Resolved</Text>
              </View>
            )}
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
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/maintenance/form",
                params: {
                  carId: String(item.carId),
                  faultDescription: item.description,
                },
              } as any)
            }
            style={[styles.fixBtn, { backgroundColor: sev?.bg ?? C.backgroundTertiary, borderColor: sev?.color ?? C.border }]}
          >
            <Feather name="tool" size={14} color={sev?.color ?? C.textTertiary} />
          </Pressable>
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
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 24 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Pressable
              onPress={() => router.push("/malfunction/add" as any)}
              style={[styles.logBtn, { borderColor: "#DC2626" }]}
            >
              <Feather name="plus" size={15} color="#DC2626" />
              <Text style={[styles.logBtnText, { color: "#DC2626" }]}>Log Another Fault</Text>
            </Pressable>
          }
        />
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
  severityBadge: {
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
  severityText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, flexWrap: "wrap" },
  footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fixBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
});
