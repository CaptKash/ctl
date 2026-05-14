import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BottomNav from "@/components/ui/BottomNav";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { localizeDigits } from "@/lib/i18n";
import { useColors } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import type { ColorScheme } from "@/constants/colors";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useDistanceUnit } from "@/context/DistanceUnitContext";
import { addToCalendar, getWritableCalendars, WritableCalendar } from "@/lib/addToCalendar";

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

function urgencyColor(days: number, C: ColorScheme): string {
  if (days < 0) return C.danger;
  if (days <= 7) return "#F97316";
  if (days <= 30) return C.warning;
  return C.success;
}

function urgencyLabel(days: number, t: (k: string, o?: any) => string): string {
  if (days < 0) return t("home.overdue", { count: Math.abs(days) });
  if (days === 0) return t("home.dueToday");
  if (days === 1) return t("home.dueTomorrow");
  return t("home.dueInDays", { count: days });
}

export default function MenuDashboardScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { unit } = useDistanceUnit();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, isAuthenticated } = useAuth();
  const [calendarLoading, setCalendarLoading] = useState<string | null>(null);
  const [activeCarIndex, setActiveCarIndex] = useState(0);
  const CHIP_WIDTH = 170;
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);
  const [calendarPickerItem, setCalendarPickerItem] = useState<UpcomingItem | null>(null);
  const [writableCalendars, setWritableCalendars] = useState<WritableCalendar[]>([]);

  const handleCardPress = (item: UpcomingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.itemKind === "inspection") {
      router.push({ pathname: "/inspection/form", params: { carId: String(item.carId) } });
    } else if (item.itemKind === "maintenance") {
      router.push({ pathname: "/maintenance/form", params: { carId: String(item.carId), preType: item.type } });
    } else {
      router.push(`/car/${item.carId}` as any);
    }
  };

  const handleAddToCalendar = async (item: UpcomingItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      const carLabel = item.nickname ?? `${item.year} ${item.make} ${item.model}`;
      await addToCalendar(`${item.type} — ${carLabel}`, item.nextDueDate, "", item.description);
      return;
    }
    const key = `${item.itemKind}-${item.id}`;
    setCalendarLoading(key);
    const calendars = await getWritableCalendars().catch(() => null);
    setCalendarLoading(null);
    if (!calendars || calendars.length === 0) return;
    if (calendars.length === 1) {
      await saveToCalendar(item, calendars[0].id);
    } else {
      setWritableCalendars(calendars);
      setCalendarPickerItem(item);
      setCalendarPickerVisible(true);
    }
  };

  const saveToCalendar = async (item: UpcomingItem, calendarId: string) => {
    const carLabel = item.nickname ?? `${item.year} ${item.make} ${item.model}`;
    const title = `${item.type} — ${carLabel}`;
    const added = await addToCalendar(title, item.nextDueDate, calendarId, item.description).catch(() => false);
    if (added) {
      Alert.alert(
        t("home.addedToCalendarTitle"),
        t("home.addedToCalendarMessage", { title }),
      );
    }
  };

  const { isFleet, FREE_CAR_LIMIT } = useSubscription();
  // Tier pill palette — matches the Subscription cards on the Settings page.
  // Free  : muted neutral
  // Fleet : amber (text #92400E on amber-100 bg, like settings.fleetCard)
  // Ent.  : indigo (text #312E81 on indigo-100 bg, like settings.enterpriseCard)
  const tierLabel = isFleet ? "CTL Fleet" : "CTL Free";
  const tierColors = isFleet
    ? { text: "#92400E", bg: "#FEF3C7", border: "#FCD34D" }
    : { text: C.textTertiary, bg: C.backgroundTertiary, border: C.border };

  const { data: cars } = useQuery<Car[]>({
    queryKey: ["cars"],
    queryFn: () => apiGet<Car[]>("/cars"),
  });

  const { data: upcoming, isLoading: upcomingLoading, refetch: refetchUpcoming } = useQuery<UpcomingItem[]>({
    queryKey: ["maintenance", "upcoming"],
    queryFn: () => apiGet<UpcomingItem[]>("/maintenance/upcoming"),
  });

  // Refetch upcoming events every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchUpcoming();
    }, [refetchUpcoming])
  );

  const fleetCount = cars?.length ?? 0;

  const today = new Date().toLocaleDateString(isRTL ? "ar" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.headerEyebrow,
              { color: C.textSecondary },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {today}
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: C.text },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {isAuthenticated && user
              ? t("home.helloUser", { name: user.name.split(" ")[0] })
              : "CTL"}
          </Text>
          <Text
            style={[
              styles.headerSub,
              { color: C.textSecondary },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {t("common.appTagline")}
          </Text>
          <View
            style={[
              styles.tierPill,
              { backgroundColor: tierColors.bg, borderColor: tierColors.border },
              isRTL && { alignSelf: "flex-end" },
            ]}
          >
            <Text style={[styles.tierPillText, { color: tierColors.text }]}>
              {tierLabel}
            </Text>
          </View>
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
          <View style={[styles.tileRow, isRTL && { flexDirection: "row-reverse" }]}>
            <LinearGradient
              colors={["#FFFFFF", "#E2E8F0", "#94A3B8"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={[styles.tileIcon, styles.tileIconMetallic]}
            >
              <Ionicons name="car" size={26} color="#334155" />
            </LinearGradient>
            <View style={styles.tileBody}>
              <Text
                style={[
                  styles.tileTitle,
                  { color: C.text },
                  isRTL && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {t("home.myFleet")}
              </Text>
              <Text
                style={[
                  styles.tileSub,
                  { color: C.textSecondary },
                  isRTL && { textAlign: "right", writingDirection: "rtl" },
                ]}
              >
                {fleetCount === 0
                  ? t("home.noCarsYet")
                  : t("home.carsRegisteredCount", { count: localizeDigits(fleetCount, i18n.language) })}
              </Text>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!isFleet && (cars?.length ?? 0) >= FREE_CAR_LIMIT) {
                  router.push("/fleet-upgrade" as any);
                } else {
                  router.push("/car/add");
                }
              }}
              hitSlop={6}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#E2E8F0", "#94A3B8"]}
                locations={[0, 0.55, 1]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={[
                  styles.addCarChip,
                  styles.addCarChipMetallic,
                  isRTL && { flexDirection: "row-reverse" },
                ]}
              >
                <Feather name="plus" size={13} color="#334155" />
                <Text style={[styles.addCarChipText, { color: "#334155" }]}>
                  {t("home.addCar")}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Car list */}
          {fleetCount > 0 && cars && (
            <>
              <View style={[styles.carListDivider, { backgroundColor: C.borderLight }]} />
              <View style={styles.carListWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carList}
                  onStartShouldSetResponder={() => true}
                  scrollEventThrottle={16}
                  onScroll={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / CHIP_WIDTH);
                    setActiveCarIndex(Math.max(0, Math.min(idx, fleetCount - 1)));
                  }}
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
                        style={[
                          styles.carChip,
                          { backgroundColor: C.backgroundTertiary },
                          isRTL && { flexDirection: "row-reverse" },
                        ]}
                      >
                        {firstPhoto ? (
                          <Image source={{ uri: firstPhoto }} style={styles.carChipPhoto} />
                        ) : (
                          <View style={[styles.carChipPhotoPlaceholder, { backgroundColor: "#DBEAFE" }]}>
                            <Ionicons name="car-outline" size={18} color={C.tint} />
                          </View>
                        )}
                        <View style={styles.carChipBody}>
                          <Text
                            style={[
                              styles.carChipName,
                              { color: C.text },
                              isRTL && { textAlign: "right", writingDirection: "rtl" },
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                          <Text
                            style={[
                              styles.carChipSub,
                              { color: C.textSecondary },
                              isRTL && { textAlign: "right", writingDirection: "rtl" },
                            ]}
                            numberOfLines={1}
                          >
                            {sub}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {fleetCount > 1 && (
                  <View style={styles.dotRow}>
                    {cars.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === activeCarIndex
                            ? { backgroundColor: C.tint, width: 16 }
                            : { backgroundColor: C.border, width: 6 },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </Pressable>

        <Text
          style={[
            styles.sectionLabel,
            { color: C.textSecondary },
            isRTL && { textAlign: "right", writingDirection: "rtl" },
          ]}
        >
          {t("home.quickActions")}
        </Text>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/event/add");
          }}
          style={({ pressed }) => [
            styles.tile,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1, borderWidth: 1, borderColor: "#2563EB" },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="plus-circle" size={24} color="#2563EB" />
          </View>
          <View style={styles.tileBody}>
            <Text
              style={[
                styles.tileTitle,
                { color: C.text },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("home.logEvent")}
            </Text>
            <Text
              style={[
                styles.tileSub,
                { color: C.textSecondary },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("home.logEventSub")}
            </Text>
          </View>
          <View style={styles.tileArrow}>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.textTertiary} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/report");
          }}
          style={({ pressed }) => [
            styles.tile,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.tileIcon, { backgroundColor: "#D1FAE5" }]}>
            <Feather name="file-text" size={24} color="#059669" />
          </View>
          <View style={styles.tileBody}>
            <Text
              style={[
                styles.tileTitle,
                { color: C.text },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("home.generateReport")}
            </Text>
            <Text
              style={[
                styles.tileSub,
                { color: C.textSecondary },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("home.generateReportSub")}
            </Text>
          </View>
          <View style={styles.tileArrow}>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.textTertiary} />
          </View>
        </Pressable>

        <Text
          style={[
            styles.sectionLabel,
            { color: C.textSecondary, marginTop: 10 },
            isRTL && { textAlign: "right", writingDirection: "rtl" },
          ]}
        >
          {t("home.upcomingEvents")}
        </Text>

        {upcomingLoading ? (
          <View
            style={[
              styles.emptyState,
              isRTL && { flexDirection: "row-reverse" },
              { backgroundColor: C.card, shadowColor: C.shadow },
            ]}
          >
            <ActivityIndicator size="small" color={C.tint} />
            <Text
              style={[
                styles.emptyText,
                { color: C.textSecondary },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("home.loadingEvents")}
            </Text>
          </View>
        ) : (!upcoming || upcoming.length === 0) ? (
          <View
            style={[
              styles.emptyState,
              isRTL && { flexDirection: "row-reverse" },
              { backgroundColor: C.card, shadowColor: C.shadow },
            ]}
          >
            <Feather name="check-circle" size={22} color={C.success} />
            <Text
              style={[
                styles.emptyText,
                { color: C.textSecondary },
                isRTL && { textAlign: "right", writingDirection: "rtl" },
              ]}
            >
              {t("home.noUpcoming")}
            </Text>
          </View>
        ) : (
          upcoming.map((item) => {
            const days = daysFromNow(item.nextDueDate);
            const color = urgencyColor(days, C);
            const label = urgencyLabel(days, t);
            const dueDate = formatDate(item.nextDueDate);

            return (
              <Pressable
                key={`${item.itemKind}-${item.id}`}
                onPress={() => handleCardPress(item)}
                style={({ pressed }) => [
                  styles.eventCard,
                  isRTL && { flexDirection: "row-reverse" },
                  { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.urgencyBar, { backgroundColor: color }]} />
                <View style={styles.eventCardBody}>
                  <View style={[styles.eventCardTop, isRTL && { flexDirection: "row-reverse" }]}>
                    <Text
                      style={[
                        styles.eventCardType,
                        { color: C.text },
                        isRTL && { textAlign: "right", writingDirection: "rtl" },
                      ]}
                      numberOfLines={1}
                    >
                      {item.type}
                    </Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: color + "22" }]}>
                      <Text style={[styles.urgencyText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.eventCardDesc,
                      { color: C.textSecondary },
                      isRTL && { textAlign: "right", writingDirection: "rtl" },
                    ]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                  <View style={[styles.eventCardBottom, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.eventCardMeta, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="car-outline" size={13} color={C.textTertiary} />
                      <Text style={[styles.eventCardMetaText, { color: C.textSecondary }]}>
                        {item.year} {item.make} {item.model}
                      </Text>
                      <Feather
                        name="calendar"
                        size={12}
                        color={C.textTertiary}
                        style={isRTL ? { marginRight: 8 } : { marginLeft: 8 }}
                      />
                      <Text style={[styles.eventCardMetaText, { color: C.textSecondary }]}>
                        {dueDate}
                      </Text>
                      {item.nextDueMileage != null && (
                        <>
                          <Feather
                            name="activity"
                            size={12}
                            color={C.textTertiary}
                            style={isRTL ? { marginRight: 8 } : { marginLeft: 8 }}
                          />
                          <Text style={[styles.eventCardMetaText, { color: C.textSecondary }]}>
                            {item.nextDueMileage.toLocaleString()} {unit}
                          </Text>
                        </>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleAddToCalendar(item)}
                      hitSlop={8}
                      style={[
                        styles.calBtn,
                        { backgroundColor: "#DBEAFE" },
                        isRTL && { marginLeft: 0, marginRight: 8 },
                      ]}
                    >
                      {calendarLoading === `${item.itemKind}-${item.id}` ? (
                        <ActivityIndicator size={13} color="#2563EB" />
                      ) : (
                        <>
                          <Feather name="calendar" size={14} color="#2563EB" />
                          <Text style={styles.calBtnText}>{t("home.addToCal")}</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <BottomNav active="dashboard" />

      <Modal
        visible={calendarPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarPickerVisible(false)}
      >
        <Pressable
          style={calStyles.overlay}
          onPress={() => setCalendarPickerVisible(false)}
        />
        <View style={[calStyles.sheet, { backgroundColor: C.card }]}>
          <View style={[calStyles.handle, { backgroundColor: C.border }]} />
          <Text
            style={[
              calStyles.title,
              { color: C.text },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {t("home.chooseCalendar")}
          </Text>
          <Text
            style={[
              calStyles.sub,
              { color: C.textSecondary },
              isRTL && { textAlign: "right", writingDirection: "rtl" },
            ]}
          >
            {t("home.chooseCalendarSub")}
          </Text>
          {writableCalendars.map((cal) => (
            <Pressable
              key={cal.id}
              onPress={async () => {
                setCalendarPickerVisible(false);
                if (calendarPickerItem) {
                  await saveToCalendar(calendarPickerItem, cal.id);
                  setCalendarPickerItem(null);
                }
              }}
              style={({ pressed }) => [
                calStyles.calRow,
                isRTL && { flexDirection: "row-reverse" },
                { borderColor: C.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[calStyles.calDot, { backgroundColor: cal.color ?? C.tint }]}
              />
              <Text
                style={[
                  calStyles.calName,
                  { color: C.text },
                  isRTL && { textAlign: "right", writingDirection: "rtl" },
                ]}
                numberOfLines={1}
              >
                {cal.title}
              </Text>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={C.textTertiary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => setCalendarPickerVisible(false)}
            style={({ pressed }) => [calStyles.cancelBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[calStyles.cancelText, { color: C.textSecondary }]}>{t("common.cancel")}</Text>
          </Pressable>
        </View>
      </Modal>
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
  tierPill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tierPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
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
  tileIconMetallic: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
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
  carListWrap: { gap: 10 },
  carList: { gap: 10, paddingBottom: 2 },
  dotRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },
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
  addCarChipMetallic: {
    borderWidth: 1,
    borderColor: "#64748B",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
  },
  addCarChipText: {
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
    width: 44,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    gap: 2,
  },
  calBtnText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
});

const calStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  calRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  calDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  cancelBtn: {
    marginTop: 20,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
