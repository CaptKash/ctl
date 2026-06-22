import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { MetalIcon } from "@/components/ui/MetalIcon";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors, useTheme } from "@/context/ThemeContext";
import { useCurrency } from "@/context/CurrencyContext";
import BottomNav from "@/components/ui/BottomNav";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { formatDate } from "@/lib/dateUtils";
import { apiGet } from "@/hooks/useApi";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
};

type MaintenanceLog = {
  id: number;
  carId: number;
  type: string;
  description: string;
  date: string;
  cost?: number | null;
  shop?: string | null;
  shopAddress?: string | null;
  warrantyPeriod?: string | null;
  billPhoto?: string | null;
  warrantyPhoto?: string | null;
  car: Car | null;
};

export default function RepairHistoryScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { currency } = useCurrency();
  const { width } = useWindowDimensions();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [viewerPhotos, setViewerPhotos] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);

  const openViewer = (photos: string[]) => {
    setViewerIndex(0);
    setViewerPhotos(photos);
  };

  const handleDownloadPhoto = (url: string) => {
    if (!url || downloadingPhoto) return;
    setViewerPhotos(null);
    setTimeout(() => doShare(url), 600);
  };

  const doShare = async (url: string) => {
    setDownloadingPhoto(true);
    try {
      const filename = `ctl_photo_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      if (url.startsWith("data:")) {
        const base64 = url.split(",")[1];
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: "base64" });
      } else {
        await FileSystem.downloadAsync(url, fileUri);
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error(t("carDetail.photo.sharingUnavailable"));
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
        dialogTitle: t("carDetail.photo.saveDialogTitle"),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(t("carDetail.photo.saveFailed"), msg);
    } finally {
      setDownloadingPhoto(false);
    }
  };

  const { data: logs, isLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ["all-maintenance"],
    queryFn: () => apiGet<MaintenanceLog[]>("/maintenance"),
  });

  function carLabel(car: Car | null) {
    if (!car) return t("repairHistory.unknownCar");
    return car.nickname ?? `${car.year} ${car.make} ${car.model}`;
  }

  return (
    <SwipeBackView style={{ backgroundColor: C.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
          <MetalIcon icon="tool" color="#D97706" bg="#FEF3C7" size={22} style={styles.iconBox} />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t("repairHistory.title")}</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary }]}>{t("repairHistory.subtitle")}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.tint} />
        </View>
      ) : !logs || logs.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="tool" size={40} color={C.textTertiary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>{t("repairHistory.emptyTitle")}</Text>
          <Text style={[styles.emptySub, { color: C.textSecondary }]}>
            {t("repairHistory.emptySub")}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {logs.map((log) => {
            const photos = [log.billPhoto, log.warrantyPhoto].filter(Boolean) as string[];
            const hasPhotos = photos.length > 0;
            const card = (
            <LinearGradient
              colors={isDark ? ["#283449", "#1E293B", "#16202F"] : ["#FFFFFF", "#F4F5F7", "#E6E8EB"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, isRTL && { borderLeftWidth: 1, borderRightWidth: 4 }]}
            >
              <View style={[styles.cardTop, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={[styles.typeBadge, { backgroundColor: "#FEF3C7" }, isRTL && { flexDirection: "row-reverse" }]}>
                  <Feather name="tool" size={12} color="#D97706" />
                  <Text style={[styles.typeBadgeText, { color: "#D97706" }]}>{log.type}</Text>
                </View>
                <Text style={[styles.carName, { color: C.textSecondary, textAlign: isRTL ? "left" : "right" }]} numberOfLines={1}>
                  {carLabel(log.car)}
                </Text>
              </View>

              <Text style={[styles.description, { color: C.text, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]} numberOfLines={2}>
                {log.description}
              </Text>

              <View style={[styles.cardMeta, isRTL && { flexDirection: "row-reverse" }]}>
                <Feather name="calendar" size={12} color={C.textSecondary} />
                <Text style={[styles.metaText, { color: C.textSecondary }]}>{formatDate(log.date)}</Text>

                {log.shop ? (
                  <>
                    <View style={styles.metaDot} />
                    <Feather name="map-pin" size={12} color={C.textSecondary} />
                    <Text style={[styles.metaText, { color: C.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                      {log.shop}
                    </Text>
                  </>
                ) : null}
              </View>

              {(log.cost != null || log.warrantyPeriod || hasPhotos) ? (
                <View style={[styles.cardFooter, isRTL && { flexDirection: "row-reverse" }]}>
                  {log.cost != null && (
                    <View style={[styles.costChip, { backgroundColor: "#D1FAE5" }]}>
                      <Text style={[styles.costChipText, { color: "#065F46" }]}>
                        {currency.symbol}{log.cost.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {log.warrantyPeriod ? (
                    <View style={[styles.warrantyChip, { backgroundColor: "#EDE9FE" }, isRTL && { flexDirection: "row-reverse" }]}>
                      <Feather name="shield" size={11} color="#7C3AED" />
                      <Text style={[styles.warrantyChipText, { color: "#7C3AED" }]}>
                        {log.warrantyPeriod}
                      </Text>
                    </View>
                  ) : null}
                  {hasPhotos ? (
                    <View style={[styles.photoChip, { backgroundColor: "#DBEAFE" }, isRTL && { flexDirection: "row-reverse" }]}>
                      <Feather name="paperclip" size={11} color="#1D4ED8" />
                      <Text style={[styles.photoChipText, { color: "#1D4ED8" }]}>{photos.length}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </LinearGradient>
            );
            return hasPhotos ? (
              <Pressable
                key={log.id}
                onPress={() => openViewer(photos)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                {card}
              </Pressable>
            ) : (
              <View key={log.id}>{card}</View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={!!viewerPhotos}
        animationType="fade"
        onRequestClose={() => setViewerPhotos(null)}
        statusBarTranslucent
      >
        <View style={styles.photoModal}>
          <Pressable onPress={() => setViewerPhotos(null)} style={styles.photoModalClose} hitSlop={12}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          {viewerPhotos && viewerPhotos.length === 1 ? (
            <Image source={{ uri: viewerPhotos[0] }} style={styles.photoFull} resizeMode="contain" />
          ) : viewerPhotos ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1, width }}
              onMomentumScrollEnd={(e) => setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {viewerPhotos.map((p, i) => (
                <View key={i} style={{ width, height: "100%", alignItems: "center", justifyContent: "center" }}>
                  <Image source={{ uri: p }} style={styles.photoFull} resizeMode="contain" />
                </View>
              ))}
            </ScrollView>
          ) : null}
          {viewerPhotos && viewerPhotos.length > 1 ? (
            <View style={styles.dotsRow}>
              {viewerPhotos.map((_, i) => (
                <View key={i} style={[styles.dot, { opacity: i === viewerIndex ? 1 : 0.4 }]} />
              ))}
            </View>
          ) : null}
          <Pressable
            onPress={() => viewerPhotos && handleDownloadPhoto(viewerPhotos[viewerIndex])}
            disabled={downloadingPhoto}
            style={styles.photoModalDownload}
            hitSlop={12}
          >
            {downloadingPhoto ? (
              <ActivityIndicator size={18} color="#fff" />
            ) : (
              <>
                <Feather name="download" size={20} color="#fff" />
                <Text style={styles.photoModalDownloadText}>{t("carDetail.photo.save")}</Text>
              </>
            )}
          </Pressable>
        </View>
      </Modal>

      <BottomNav active="dashboard" />
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#D97706",
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  carName: { fontSize: 11, fontFamily: "Inter_500Medium", flexShrink: 1 },
  description: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#CBD5E1", marginHorizontal: 2 },
  cardFooter: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  costChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  costChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  warrantyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  warrantyChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  photoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  photoModal: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  photoModalClose: {
    position: "absolute",
    top: 56,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoFull: { width: "100%", height: "80%" },
  dotsRow: { position: "absolute", bottom: 120, flexDirection: "row", gap: 6, alignSelf: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  photoModalDownload: {
    position: "absolute",
    bottom: 56,
    right: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  photoModalDownloadText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
