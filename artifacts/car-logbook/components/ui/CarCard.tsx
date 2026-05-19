import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/context/ThemeContext";
import { BrandLogo } from "@/components/BrandLogo";
import { useTranslation } from "react-i18next";
import { localizeBrand } from "@/lib/carBrandLogo";
import { localizeDigits } from "@/lib/i18n";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  nickname?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
  photos?: string | null;
};

type Props = {
  car: Car;
  onPress: () => void;
  onLogEvent?: () => void;
  accentBg?: string;
  accentIcon?: string;
  accentBorder?: string;
};

const CAR_COLORS: Record<string, string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#10B981",
  black: "#1F2937",
  white: "#F9FAFB",
  silver: "#9CA3AF",
  gray: "#6B7280",
  grey: "#6B7280",
  yellow: "#F59E0B",
  orange: "#F97316",
  brown: "#92400E",
  purple: "#8B5CF6",
};

function getCarColor(color?: string | null): string {
  if (!color) return "#6B7280";
  return CAR_COLORS[color.toLowerCase()] ?? "#6B7280";
}

function getFirstPhoto(photos?: string | null): string | null {
  if (!photos) return null;
  try {
    const arr: string[] = JSON.parse(photos);
    return arr.length > 0 ? arr[0] : null;
  } catch {
    return null;
  }
}

export function CarCard({ car, onPress, onLogEvent, accentBg, accentIcon, accentBorder }: Props) {
  const C = useColors();
  const { i18n } = useTranslation();
  const brand = localizeBrand(car.make, i18n.language);
  const firstPhoto = getFirstPhoto(car.photos);
  const thumbBg = accentBg ?? C.infoLight;
  const thumbIcon = accentIcon ?? C.info;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, opacity: pressed ? 0.92 : 1, shadowColor: C.shadow },
        accentBorder ? { borderWidth: 1.5, borderColor: accentBorder } : null,
      ]}
    >
      {/* Thumbnail */}
      <View style={[styles.iconContainer, { backgroundColor: firstPhoto ? thumbBg : "#FFFFFF" }]}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.photo} resizeMode="cover" />
        ) : (
          <>
            <BrandLogo make={car.make} size={56} fallbackBg={thumbBg} fallbackIconColor={thumbIcon} />
            {car.color && (
              <View style={[styles.colorDot, { backgroundColor: getCarColor(car.color) }]} />
            )}
          </>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.makeModel, { color: C.text }]} numberOfLines={1}>
          {brand} {car.model}
        </Text>
        <Text style={[styles.sub, { color: C.textSecondary }]} numberOfLines={1}>
          {[car.nickname, car.year != null ? localizeDigits(car.year, i18n.language) : null].filter(Boolean).join("  |  ")}
        </Text>
        {(car.licensePlate || car.mileage != null) && (
          <Text style={[styles.detail, { color: C.textTertiary }]} numberOfLines={1}>
            {[
              car.licensePlate,
              car.mileage != null ? `${localizeDigits(car.mileage.toLocaleString(), i18n.language)} km` : null,
            ]
              .filter(Boolean)
              .join("   ·   ")}
          </Text>
        )}
      </View>

      {/* Right actions */}
      <View style={styles.rightCol}>
        {onLogEvent ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onLogEvent();
            }}
            style={({ pressed }) => [
              styles.logBtn,
              { opacity: pressed ? 0.75 : 1 },
            ]}
            hitSlop={4}
          >
            <Feather name="plus" size={12} color="#2563EB" />
            <Text style={styles.logBtnText}>Technical Log</Text>
          </Pressable>
        ) : (
          <Feather name="chevron-right" size={18} color={C.textTertiary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: {
    width: 58,
    height: 58,
  },
  colorDot: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  makeModel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  detail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rightCol: {
    alignItems: "center",
    gap: 8,
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  logBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
});
