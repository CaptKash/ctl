import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SectionList,
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
  phase: string;
  odometer?: number | null;
  inputMethod: string;
  completed: boolean;
  car: Car | null;
};

const PHASE_LABELS: Record<string, string> = {
  car_running: "Car Running",
  car_started: "Car Started",
  parking: "Parking",
  during_drive: "During Drive",
};

export default function FaultsScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: faults, isLoading } = useQuery<FaultRecord[]>({
    queryKey: ["malfunctions-all"],
    queryFn: () => apiGet<FaultRecord[]>("/malfunctions"),
  });

  const carLabel = (car: Car | null) => {
    if (!car) return "Unknown Car";
    const base = `${car.year} ${car.make} ${car.model}`;
    return car.nickname ? `${car.nickname} — ${base}` : base;
  };

  type Section = { title: string; carId: number; data: FaultRecord[] };

  const sections: Section[] = React.useMemo(() => {
    if (!faults) return [];
    const map = new Map<number, FaultRecord[]>();
    for (const f of faults) {
      const existing = map.get(f.carId) ?? [];
      existing.push(f);
      map.set(f.carId, existing);
    }
    return Array.from(map.entries()).map(([carId, records]) => ({
      title: carLabel(records[0].car),
      carId,
      data: records,
    }));
  }, [faults]);

  const totalCount = faults?.length ?? 0;
  const openCount = faults?.filter((f) => !f.completed).length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="alert-triangle" size={22} color="#DC2626" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>All Faults</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>
              {totalCount === 0 ? "No faults logged" : `${openCount} open · ${totalCount} total`}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.tint} />
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/car/faults", params: { id: String(section.carId) } } as any)}
              style={({ pressed }) => [
                styles.sectionHeader,
                { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={[styles.sectionIconWrap, { backgroundColor: "#FEE2E2" }]}>
                <Feather name="truck" size={14} color="#DC2626" />
              </View>
              <Text style={[styles.sectionTitle, { color: C.text }]} numberOfLines={1}>{section.title}</Text>
              <Feather name="chevron-right" size={14} color={C.textTertiary} />
            </Pressable>
          )}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: item.completed ? C.border : "#FCA5A5" }]}>
              <View style={styles.cardTop}>
                <View style={[styles.dot, { backgroundColor: item.completed ? C.success : "#DC2626" }]} />
                <Text style={[styles.cardDesc, { color: C.text }]} numberOfLines={2}>{item.description}</Text>
                {item.completed && (
                  <View style={[styles.badge, { backgroundColor: "#D1FAE5" }]}>
                    <Text style={[styles.badgeText, { color: C.success }]}>Resolved</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardMeta}>
                <Feather name="calendar" size={12} color={C.textTertiary} />
                <Text style={[styles.metaText, { color: C.textTertiary }]}>{formatDate(item.date)}</Text>
                {item.phase ? (
                  <>
                    <Text style={[styles.metaDot, { color: C.textTertiary }]}>·</Text>
                    <Feather name="activity" size={12} color={C.textTertiary} />
                    <Text style={[styles.metaText, { color: C.textTertiary }]}>
                      {PHASE_LABELS[item.phase] ?? item.phase}
                    </Text>
                  </>
                ) : null}
                {item.odometer != null ? (
                  <>
                    <Text style={[styles.metaDot, { color: C.textTertiary }]}>·</Text>
                    <Feather name="navigation" size={12} color={C.textTertiary} />
                    <Text style={[styles.metaText, { color: C.textTertiary }]}>{item.odometer.toLocaleString()} km</Text>
                  </>
                ) : null}
              </View>
            </View>
          )}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
          ItemSeparatorComponent={() => <View style={{ height: 8, marginHorizontal: 16 }} />}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    marginHorizontal: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  cardDesc: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
    alignSelf: "center",
  },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    paddingLeft: 16,
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaDot: { fontSize: 12 },
});
