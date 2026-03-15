import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Upcoming Events</Text>
        <View style={{ width: 36 }} />
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
                    <MaterialCommunityIcons name="car-side" size={13} color={C.textTertiary} />
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
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
