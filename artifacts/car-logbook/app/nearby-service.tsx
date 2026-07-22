import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { errorMessage } from "@/lib/errors";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";

// ── Types ────────────────────────────────────────────────────────────────────

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

interface ServiceCenter {
  id: number;
  name: string;
  lat: number;
  lon: number;
  type: string;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distanceKm: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function friendlyType(tags: Record<string, string>): string {
  const amenity = tags.amenity ?? "";
  const shop = tags.shop ?? "";
  if (amenity === "car_repair") return "autoRepair";
  if (amenity === "car_wash") return "carWash";
  if (amenity === "car_service") return "serviceCenter";
  if (shop === "tyres") return "tireShop";
  if (shop === "car_parts") return "partsStore";
  if (shop === "car") return "dealership";
  return "autoService";
}

function formatAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function fetchNearby(
  lat: number,
  lon: number,
  radiusM = 25000
): Promise<ServiceCenter[]> {
  const query = `[out:json][timeout:25];(node["amenity"="car_repair"](around:${radiusM},${lat},${lon});node["amenity"="car_service"](around:${radiusM},${lat},${lon});node["shop"="tyres"](around:${radiusM},${lat},${lon});node["shop"="car_parts"](around:${radiusM},${lat},${lon});way["amenity"="car_repair"](around:${radiusM},${lat},${lon});way["amenity"="car_service"](around:${radiusM},${lat},${lon});way["shop"="tyres"](around:${radiusM},${lat},${lon}););out center;`;

  let lastError = "No mirrors responded";
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const resp = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
      });
      if (!resp.ok) {
        lastError = `Server error ${resp.status}`;
        continue;
      }
      const data = (await resp.json()) as { elements?: OverpassElement[] };
      if (!data.elements) {
        lastError = "Unexpected response format";
        continue;
      }
      const results: ServiceCenter[] = data.elements
        .filter((el) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          return elLat != null && elLon != null;
        })
        .map((el) => {
          const tags: Record<string, string> = el.tags ?? {};
          const elLat = (el.lat ?? el.center?.lat)!;
          const elLon = (el.lon ?? el.center?.lon)!;
          return {
            id: el.id,
            name: tags.name ?? "",
            lat: elLat,
            lon: elLon,
            type: friendlyType(tags),
            address: formatAddress(tags),
            phone: tags.phone ?? tags["contact:phone"],
            website: tags.website ?? tags["contact:website"],
            openingHours: tags.opening_hours,
            distanceKm: haversineKm(lat, lon, elLat, elLon),
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);
      return results;
    } catch (e) {
      lastError = errorMessage(e, "Network error");
    }
  }
  throw new Error(lastError);
}

function openMaps(center: ServiceCenter) {
  const label = encodeURIComponent(center.name);
  if (Platform.OS === "ios") {
    const googleUrl = `comgooglemaps://?q=${label}&center=${center.lat},${center.lon}`;
    const appleUrl = `maps://maps.apple.com/?ll=${center.lat},${center.lon}&q=${label}`;
    Linking.openURL(googleUrl).catch(() => Linking.openURL(appleUrl));
  } else {
    Linking.openURL(`geo:${center.lat},${center.lon}?q=${label}`);
  }
}

function formatDist(km: number, t: TFunction): string {
  if (km < 1) return t("nearbyService.distMeters", { value: Math.round(km * 1000) });
  return t("nearbyService.distKm", { value: km.toFixed(1) });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NearbyServiceScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [phase, setPhase] = useState<
    "idle" | "locating" | "fetching" | "done" | "denied" | "error"
  >("idle");
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const allTypes = ["all", ...Array.from(new Set(centers.map((c) => c.type)))];
  const visible =
    filter === "all" ? centers : centers.filter((c) => c.type === filter);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setPhase("locating");

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPhase("denied");
      return;
    }

    if (!isRefresh) setPhase("fetching");

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const data = await fetchNearby(
        pos.coords.latitude,
        pos.coords.longitude
      );
      setCenters(data);
      setPhase("done");
    } catch (e) {
      setErrorMsg(errorMessage(e, "Something went wrong"));
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  // ── Loading / Error states ──────────────────────────────────────────────

  const renderState = () => {
    if (phase === "locating" || phase === "fetching") {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            {phase === "locating" ? t("nearbyService.locating") : t("nearbyService.fetching")}
          </Text>
        </View>
      );
    }

    if (phase === "denied") {
      return (
        <View style={styles.center}>
          <MetalIcon icon="map-pin" color="#D97706" bg="#FEF3C7" size={28} style={styles.stateIcon} />
          <Text style={[styles.stateTitle, { color: C.text }]}>
            {t("nearbyService.deniedTitle")}
          </Text>
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            {t("nearbyService.deniedMessage")}
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={[styles.stateBtn, { backgroundColor: "#1D4ED8" }]}
          >
            <Text style={styles.stateBtnText}>{t("nearbyService.openSettings")}</Text>
          </Pressable>
        </View>
      );
    }

    if (phase === "error") {
      return (
        <View style={styles.center}>
          <MetalIcon icon="alert-circle" color="#DC2626" bg="#FEE2E2" size={28} style={styles.stateIcon} />
          <Text style={[styles.stateTitle, { color: C.text }]}>
            {t("nearbyService.errorTitle")}
          </Text>
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            {errorMsg}
          </Text>
          <Pressable
            onPress={() => load()}
            style={[styles.stateBtn, { backgroundColor: "#1D4ED8" }]}
          >
            <Text style={styles.stateBtnText}>{t("nearbyService.tryAgain")}</Text>
          </Pressable>
        </View>
      );
    }

    if (phase === "done" && centers.length === 0) {
      return (
        <View style={styles.center}>
          <MetalIcon icon="search" color="#9CA3AF" bg="#F3F4F6" size={28} style={styles.stateIcon} />
          <Text style={[styles.stateTitle, { color: C.text }]}>
            {t("nearbyService.emptyTitle")}
          </Text>
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            {t("nearbyService.emptyMessage", { km: 25 })}
          </Text>
        </View>
      );
    }

    return null;
  };

  // ── Card ──────────────────────────────────────────────────────────────────

  const renderCard = (center: ServiceCenter) => (
    <Pressable
      key={center.id}
      onPress={() => openMaps(center)}
      style={({ pressed }) => [
        styles.card,
        isRTL && { flexDirection: "row-reverse" },
        { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: C.text, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
          {center.name || t("nearbyService.unnamedShop")}
        </Text>
        <Text style={[styles.cardType, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
          {t(`nearbyService.types.${center.type}`)}
        </Text>
        {center.address ? (
          <Text
            style={[styles.cardAddress, { color: C.textTertiary, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {center.address}
          </Text>
        ) : null}
        {center.openingHours ? (
          <Text
            style={[styles.cardHours, { color: C.textTertiary, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {center.openingHours}
          </Text>
        ) : null}
      </View>
      <View style={[styles.cardRight, isRTL && { alignItems: "flex-start" }]}>
        <Text style={[styles.distText, { color: "#1D4ED8" }]}>
          {formatDist(center.distanceKm, t)}
        </Text>
        <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={C.textTertiary} />
      </View>
    </Pressable>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card },
        ]}
      >
        <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="map-pin" color="#059669" bg="#ECFDF5" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("nearbyService.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("nearbyService.sub")}</Text>
          </View>
          <Pressable onPress={() => load()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name="refresh-cw" size={20} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Filter pills — shown only once we have results */}
      {phase === "done" && centers.length > 0 && allTypes.length > 1 && (
        <View style={[styles.pillRow, isRTL && { flexDirection: "row-reverse" }]}>
          {allTypes.map((type) => {
            const active = type === filter;
            return (
              <Pressable
                key={type}
                onPress={() => setFilter(type)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? C.tint : "rgba(128,128,128,0.12)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? "#fff" : C.textSecondary },
                  ]}
                >
                  {type === "all" ? t("nearbyService.filterAll") : t(`nearbyService.types.${type}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Count label */}
      {phase === "done" && centers.length > 0 && (
        <Text style={[styles.countLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
          {t("nearbyService.count", { count: visible.length, km: 25 })}
        </Text>
      )}

      {/* Main content */}
      {phase === "idle" || phase === "locating" || phase === "fetching" ||
      phase === "denied" || phase === "error" ||
      (phase === "done" && centers.length === 0) ? (
        renderState()
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {visible.map(renderCard)}
          <Text style={[styles.attribution, { color: C.textTertiary }]}>
            {t("nearbyService.attribution")}
          </Text>
        </ScrollView>
      )}

      <BottomNav active="tools" />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },

  pillRow: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, gap: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: "500" },

  countLabel: {
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 4,
  },

  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  cardType: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  cardAddress: { fontSize: 12, marginTop: 1 },
  cardHours: { fontSize: 11, marginTop: 2 },

  cardRight: { alignItems: "flex-end", gap: 4 },
  distText: { fontSize: 13, fontWeight: "700" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  stateBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  stateBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  attribution: { fontSize: 11, textAlign: "center", marginTop: 8 },
});
