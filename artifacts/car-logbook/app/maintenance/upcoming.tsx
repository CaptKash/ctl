import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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
import Colors from "@/constants/colors";
import { apiGet } from "@/hooks/useApi";

type UpcomingRecord = {
  id: number;
  carId: number;
  type: string;
  description: string;
  nextDueDate: string;
  nextDueMileage: number | null;
  make: string;
  model: string;
  year: number;
};

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number, C: typeof Colors.light): string {
  if (days < 0) return C.danger;
  if (days <= 7) return "#F97316";
  if (days <= 30) return C.warning;
  return C.success;
}

function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days} days`;
}

function groupByUrgency(records: UpcomingRecord[]) {
  const overdue: UpcomingRecord[] = [];
  const thisWeek: UpcomingRecord[] = [];
  const thisMonth: UpcomingRecord[] = [];
  const later: UpcomingRecord[] = [];

  for (const r of records) {
    const days = daysFromNow(r.nextDueDate);
    if (days < 0) overdue.push(r);
    else if (days <= 7) thisWeek.push(r);
    else if (days <= 30) thisMonth.push(r);
    else later.push(r);
  }

  const sections = [];
  if (overdue.length) sections.push({ title: "Overdue", data: overdue });
  if (thisWeek.length) sections.push({ title: "This Week", data: thisWeek });
  if (thisMonth.length) sections.push({ title: "This Month", data: thisMonth });
  if (later.length) sections.push({ title: "Later", data: later });
  return sections;
}

export default function UpcomingMaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: records, isLoading } = useQuery<UpcomingRecord[]>({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => apiGet<UpcomingRecord[]>("/maintenance/upcoming"),
  });

  const sections = groupByUrgency(records ?? []);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Upcoming Maintenance</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: C.successLight }]}>
            <Feather name="check-circle" size={36} color={C.success} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>All caught up!</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            No upcoming maintenance scheduled.{"\n"}Log service records to track due dates.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionDot,
                  {
                    backgroundColor:
                      section.title === "Overdue"
                        ? C.danger
                        : section.title === "This Week"
                        ? "#F97316"
                        : section.title === "This Month"
                        ? C.warning
                        : C.success,
                  },
                ]}
              />
              <Text style={[styles.sectionTitle, { color: C.text }]}>{section.title}</Text>
              <Text style={[styles.sectionCount, { color: C.textSecondary }]}>
                {section.data.length}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const days = daysFromNow(item.nextDueDate);
            const color = urgencyColor(days, C);
            const label = urgencyLabel(days);
            const dueDate = new Date(item.nextDueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/car/[id]",
                    params: { id: String(item.carId) },
                  })
                }
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.92 : 1 },
                ]}
              >
                <View style={[styles.urgencyBar, { backgroundColor: color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardType, { color: C.text }]} numberOfLines={1}>
                      {item.type}
                    </Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: color + "22" }]}>
                      <Text style={[styles.urgencyText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cardDesc, { color: C.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Feather name="truck" size={12} color={C.textTertiary} />
                    <Text style={[styles.cardMetaText, { color: C.textSecondary }]}>
                      {item.year} {item.make} {item.model}
                    </Text>
                    <Feather name="calendar" size={12} color={C.textTertiary} style={{ marginLeft: 8 }} />
                    <Text style={[styles.cardMetaText, { color: C.textSecondary }]}>
                      {dueDate}
                    </Text>
                    {item.nextDueMileage != null && (
                      <>
                        <Feather name="activity" size={12} color={C.textTertiary} style={{ marginLeft: 8 }} />
                        <Text style={[styles.cardMetaText, { color: C.textSecondary }]}>
                          {item.nextDueMileage.toLocaleString()} km
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={C.textTertiary} style={{ alignSelf: "center" }} />
              </Pressable>
            );
          }}
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

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  listContent: { padding: 16, gap: 8 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  sectionCount: { fontSize: 13, fontFamily: "Inter_400Regular" },

  card: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  urgencyBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 5 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardType: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  urgencyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  urgencyText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
