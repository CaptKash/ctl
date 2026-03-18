import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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
import { formatDate } from "@/lib/dateUtils";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
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

export default function UpcomingEventsScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: records, isLoading } = useQuery<UpcomingRecord[]>({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => apiGet<UpcomingRecord[]>("/maintenance/upcoming"),
  });

  const sortedRecords = records ?? [];

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="calendar" size={22} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Upcoming Events</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Service schedule</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : sortedRecords.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: C.successLight }]}>
            <Feather name="check-circle" size={36} color={C.success} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>All caught up!</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            No upcoming events scheduled.{"\n"}Log service records to track due dates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === "web" ? 84 : insets.bottom) + 40 },
          ]}
          renderItem={({ item }) => {
            const days = daysFromNow(item.nextDueDate);
            const color = urgencyColor(days, C);
            const label = urgencyLabel(days);
            const dueDate = formatDate(item.nextDueDate);

            return (
              <View
                style={[styles.card, { backgroundColor: C.card, shadowColor: C.shadow }]}
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
                  <View style={styles.cardBottom}>
                    <View style={styles.cardMeta}>
                      <Ionicons name="car-outline" size={13} color={C.textTertiary} />
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
                    <View style={[styles.calBtn, { backgroundColor: "#DBEAFE" }]}>
                      <Feather name="calendar" size={15} color="#2563EB" />
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
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

  listContent: { padding: 16, gap: 10 },

  card: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
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
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  cardMeta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  cardMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  calBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", marginLeft: 8 },
});
