import { Feather, Ionicons } from "@expo/vector-icons";
import BottomNav from "@/components/ui/BottomNav";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { addToCalendar } from "@/lib/addToCalendar";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  photos?: string | null;
};
type UpcomingItem = {
  id: number;
  carId: number;
  itemKind: "maintenance" | "license" | "insurance" | "inspection";
  type: string;
  description: string;
  nextDueDate: string;
  nextDueMileage: number | null;
  make: string;
  model: string;
  year: number;
  nickname: string | null;
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

export default function MenuDashboardScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, isAuthenticated } = useAuth();
  const [calendarLoading, setCalendarLoading] = useState<string | null>(null);

  const handleAddToCalendar = async (item: UpcomingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const key = `${item.itemKind}-${item.id}`;
    setCalendarLoading(key);
    const carLabel = item.nickname ?? `${item.year} ${item.make} ${item.model}`;
    const title = `${item.type} — ${carLabel}`;
    const notes = item.description;
    const added = await addToCalendar(title, item.nextDueDate, notes).catch(() => false);
    setCalendarLoading(null);
    if (added) {
      Alert.alert("Added to Calendar", `"${item.type}" has been saved to your calendar.`);
    }
  };

  const { data: cars } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const { data: upcoming, isLoading: upcomingLoading } = useQuery<UpcomingItem[]>({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => apiGet<UpcomingItem[]>("/maintenance/upcoming"),
  });

  const fleetCount = cars?.length ?? 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerEyebrow, { color: C.textSecondary }]}>{today}</Text>
          <Text style={[styles.headerTitle, { color: C.text }]}>
            {isAuthenticated && user ? `Hello, ${user.name.split(" ")[0]}!` : "CTL"}
          </Text>
          <Text style={[styles.headerSub, { color: C.textSecondary }]}>Car Technical Log</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Quick Actions</Text>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/fleet");
          }}
          style={({ pressed }) => [
            styles.tile,
            styles.tileColumn,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
            fleetCount === 0 && { borderWidth: 2, borderColor: C.tint },
          ]}
        >
          {/* Header row */}
          <View style={styles.tileRow}>
            <View style={[styles.tileIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="car-outline" size={26} color={C.tint} />
            </View>
            <View style={styles.tileBody}>
              <Text style={[styles.tileTitle, { color: C.text }]}>My Fleet</Text>
              <Text style={[styles.tileSub, { color: C.textSecondary }]}>
                {fleetCount === 0
                  ? "No cars registered yet"
                  : `${fleetCount} car${fleetCount === 1 ? "" : "s"} registered`}
              </Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/car/add");
              }}
              hitSlop={6}
              style={[styles.addCarChip, { backgroundColor: C.tint }]}
            >
              <Feather name="plus" size={13} color="#fff" />
              <Text style={styles.addCarChipText}>Add Car</Text>
            </Pressable>
          </View>

          {/* Car list */}
          {fleetCount > 0 && cars && (
            <>
              <View style={[styles.carListDivider, { backgroundColor: C.borderLight }]} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carList}
                onStartShouldSetResponder={() => true}
              >
                {cars.map((car) => {
                  let firstPhoto: string | null = null;
                  try { firstPhoto = car.photos ? JSON.parse(car.photos)[0] ?? null : null; } catch {}
                  const label = car.nickname ?? `${car.year} ${car.make}`;
                  const sub = car.nickname ? `${car.year} ${car.make} ${car.model}` : car.model;
                  return (
                    <Pressable
                      key={car.id}
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/car/${car.id}`);
                      }}
                      style={[styles.carChip, { backgroundColor: C.backgroundTertiary }]}
                    >
                      {firstPhoto ? (
                        <Image source={{ uri: firstPhoto }} style={styles.carChipPhoto} />
                      ) : (
                        <View style={[styles.carChipPhotoPlaceholder, { backgroundColor: "#DBEAFE" }]}>
                          <Ionicons name="car-outline" size={18} color={C.tint} />
                        </View>
                      )}
                      <View style={styles.carChipBody}>
                        <Text style={[styles.carChipName, { color: C.text }]} numberOfLines={1}>{label}</Text>
                        <Text style={[styles.carChipSub, { color: C.textSecondary }]} numberOfLines={1}>{sub}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/event/add");
          }}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="plus-circle" size={24} color={C.tint} />
          </View>
          <View style={styles.tileBody}>
            <Text style={[styles.tileTitle, { color: C.text }]}>Log Event</Text>
            <Text style={[styles.tileSub, { color: C.textSecondary }]}>
              Log a fault, repair, or renewal
            </Text>
          </View>
          <View style={styles.tileArrow}>
            <Feather name="chevron-right" size={18} color={C.textTertiary} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/report");
          }}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#D1FAE5" }]}>
            <Feather name="file-text" size={24} color="#059669" />
          </View>
          <View style={styles.tileBody}>
            <Text style={[styles.tileTitle, { color: C.text }]}>Generate Report</Text>
            <Text style={[styles.tileSub, { color: C.textSecondary }]}>
              Export faults &amp; repair history
            </Text>
          </View>
          <View style={styles.tileArrow}>
            <Feather name="chevron-right" size={18} color={C.textTertiary} />
          </View>
        </Pressable>

        <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 10 }]}>
          Upcoming Events
        </Text>

        {upcomingLoading ? (
          <View style={[styles.emptyState, { backgroundColor: C.card, shadowColor: C.shadow }]}>
            <ActivityIndicator size="small" color={C.tint} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Loading events…</Text>
          </View>
        ) : (!upcoming || upcoming.length === 0) ? (
          <View style={[styles.emptyState, { backgroundColor: C.card, shadowColor: C.shadow }]}>
            <Feather name="check-circle" size={22} color={C.success} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              No upcoming events scheduled.
            </Text>
          </View>
        ) : (
          upcoming.map((item) => {
            const days = daysFromNow(item.nextDueDate);
            const color = urgencyColor(days, C);
            const label = urgencyLabel(days);
            const dueDate = formatDate(item.nextDueDate);

            return (
              <View
                key={`${item.itemKind}-${item.id}`}
                style={[styles.eventCard, { backgroundColor: C.card, shadowColor: C.shadow }]}
              >
                <View style={[styles.urgencyBar, { backgroundColor: color }]} />
                <View style={styles.eventCardBody}>
                  <View style={styles.eventCardTop}>
                    <Text style={[styles.eventCardType, { color: C.text }]} numberOfLines={1}>
                      {item.type}
                    </Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: color + "22" }]}>
                      <Text style={[styles.urgencyText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.eventCardDesc, { color: C.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.eventCardBottom}>
                    <View style={styles.eventCardMeta}>
                      <Ionicons name="car-outline" size={13} color={C.textTertiary} />
                      <Text style={[styles.eventCardMetaText, { color: C.textSecondary }]}>
                        {item.year} {item.make} {item.model}
                      </Text>
                      <Feather name="calendar" size={12} color={C.textTertiary} style={{ marginLeft: 8 }} />
                      <Text style={[styles.eventCardMetaText, { color: C.textSecondary }]}>
                        {dueDate}
                      </Text>
                      {item.nextDueMileage != null && (
                        <>
                          <Feather name="activity" size={12} color={C.textTertiary} style={{ marginLeft: 8 }} />
                          <Text style={[styles.eventCardMetaText, { color: C.textSecondary }]}>
                            {item.nextDueMileage.toLocaleString()} km
                          </Text>
                        </>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleAddToCalendar(item)}
                      hitSlop={8}
                      style={[styles.calBtn, { backgroundColor: "#DBEAFE" }]}
                    >
                      {calendarLoading === `${item.itemKind}-${item.id}` ? (
                        <ActivityIndicator size={13} color="#2563EB" />
                      ) : (
                        <Feather name="calendar" size={14} color="#2563EB" />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="dashboard" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  headerEyebrow: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 24 },

  grid: { padding: 20, gap: 14 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 80,
  },
  tileColumn: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 0,
  },
  tileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  tileIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileBody: {
    flex: 1,
    gap: 3,
  },
  tileTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tileSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  tileArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  carListDivider: { height: StyleSheet.hairlineWidth, marginTop: 14, marginBottom: 12 },
  carList: { gap: 10, paddingBottom: 2 },
  carChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 10,
    minWidth: 140,
    maxWidth: 200,
  },
  carChipPhoto: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  carChipPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  carChipBody: { flex: 1, gap: 2 },
  carChipName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  carChipSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  addCarChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addCarChipText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },

  eventCard: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  urgencyBar: { width: 4 },
  eventCardBody: { flex: 1, padding: 14, gap: 5 },
  eventCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventCardType: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  urgencyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  urgencyText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  eventCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  eventCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  eventCardMeta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  eventCardMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  calBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
