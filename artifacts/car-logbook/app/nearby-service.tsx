import { Feather } from "@expo/vector-icons";
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
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";

// ── Types ────────────────────────────────────────────────────────────────────

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
  if (amenity === "car_repair") return "Auto Repair";
  if (amenity === "car_wash") return "Car Wash";
  if (amenity === "car_service") return "Service Center";
  if (shop === "tyres") return "Tire Shop";
  if (shop === "car_parts") return "Parts Store";
  if (shop === "car") return "Dealership";
  return "Auto Service";
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
  radiusM = 10000
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
      const data = await resp.json();
      if (!data.elements) {
        lastError = "Unexpected response format";
        continue;
      }
      const results: ServiceCenter[] = data.elements
        .filter((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          return elLat != null && elLon != null;
        })
        .map((el: any) => {
          const tags: Record<string, string> = el.tags ?? {};
          const elLat: number = el.lat ?? el.center.lat;
          const elLon: number = el.lon ?? el.center.lon;
          return {
            id: el.id,
            name: tags.name ?? "Unnamed Shop",
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
        .sort((a: ServiceCenter, b: ServiceCenter) => a.distanceKm - b.distanceKm);
      return results;
    } catch (e: any) {
      lastError = e.message ?? "Network error";
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

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NearbyServiceScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [phase, setPhase] = useState<
    "idle" | "locating" | "fetching" | "done" | "denied" | "error"
  >("idle");
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("All");

  const allTypes = ["All", ...Array.from(new Set(centers.map((c) => c.type)))];
  const visible =
    filter === "All" ? centers : centers.filter((c) => c.type === filter);

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
    } catch (e: any) {
      setErrorMsg(e.message ?? "Something went wrong");
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
            {phase === "locating" ? "Getting your location…" : "Finding nearby shops…"}
          </Text>
        </View>
      );
    }

    if (phase === "denied") {
      return (
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="map-pin" size={28} color="#D97706" />
          </View>
          <Text style={[styles.stateTitle, { color: C.text }]}>
            Location Access Needed
          </Text>
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            Please enable location access in your device settings so CTL can
            find nearby service centers.
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={[styles.stateBtn, { backgroundColor: "#1D4ED8" }]}
          >
            <Text style={styles.stateBtnText}>Open Settings</Text>
          </Pressable>
        </View>
      );
    }

    if (phase === "error") {
      return (
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="alert-circle" size={28} color="#DC2626" />
          </View>
          <Text style={[styles.stateTitle, { color: C.text }]}>
            Couldn't Load Results
          </Text>
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            {errorMsg}
          </Text>
          <Pressable
            onPress={() => load()}
            style={[styles.stateBtn, { backgroundColor: "#1D4ED8" }]}
          >
            <Text style={styles.stateBtnText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (phase === "done" && centers.length === 0) {
      return (
        <View style={styles.center}>
          <View style={[styles.stateIcon, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="search" size={28} color="#9CA3AF" />
          </View>
          <Text style={[styles.stateTitle, { color: C.text }]}>
            None Found Nearby
          </Text>
          <Text style={[styles.stateText, { color: C.textSecondary }]}>
            No service centers found within 10 km of your location.
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
        { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.cardIconBox, { backgroundColor: "#EFF6FF" }]}>
        <Feather name="tool" size={20} color="#1D4ED8" />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: C.text }]} numberOfLines={1}>
          {center.name}
        </Text>
        <Text style={[styles.cardType, { color: C.textSecondary }]}>
          {center.type}
        </Text>
        {center.address ? (
          <Text
            style={[styles.cardAddress, { color: C.textTertiary }]}
            numberOfLines={1}
          >
            {center.address}
          </Text>
        ) : null}
        {center.openingHours ? (
          <Text
            style={[styles.cardHours, { color: C.textTertiary }]}
            numberOfLines={1}
          >
            {center.openingHours}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.distText, { color: "#1D4ED8" }]}>
          {formatDist(center.distanceKm)}
        </Text>
        <Feather name="chevron-right" size={16} color={C.textTertiary} />
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
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <View style={[styles.iconBox, { backgroundColor: "#ECFDF5" }]}>
            <Feather name="map-pin" size={22} color="#059669" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>Service Centers</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>Near your location</Text>
          </View>
          <Pressable onPress={() => load()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} hitSlop={8}>
            <Feather name="refresh-cw" size={20} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Filter pills — shown only once we have results */}
      {phase === "done" && centers.length > 0 && allTypes.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScrollView}
          contentContainerStyle={styles.pillRow}
        >
          {allTypes.map((t) => {
            const active = t === filter;
            return (
              <Pressable
                key={t}
                onPress={() => setFilter(t)}
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
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Count label */}
      {phase === "done" && centers.length > 0 && (
        <Text style={[styles.countLabel, { color: C.textSecondary }]}>
          {visible.length} {visible.length === 1 ? "result" : "results"} within 10 km
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
            Data © OpenStreetMap contributors
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

  pillScrollView: { flexGrow: 0, alignSelf: "flex-start", width: "100%" },
  pillRow: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10, gap: 8, flexDirection: "row", alignItems: "flex-start" },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 14, fontWeight: "500" },

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
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
