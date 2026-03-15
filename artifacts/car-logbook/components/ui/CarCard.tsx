import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  licensePlate?: string | null;
  mileage?: number | null;
  photos?: string | null;
};

type Props = {
  car: Car;
  onPress: () => void;
  onLongPress?: () => void;
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

export function CarCard({ car, onPress, onLongPress }: Props) {
  const C = Colors.light;
  const firstPhoto = getFirstPhoto(car.photos);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, opacity: pressed ? 0.92 : 1, shadowColor: C.shadow },
      ]}
    >
      {/* Thumbnail */}
      <View style={[styles.iconContainer, { backgroundColor: C.infoLight }]}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.photo} resizeMode="cover" />
        ) : (
          <>
            <MaterialCommunityIcons name="car-side" size={32} color={C.info} />
            {car.color && (
              <View style={[styles.colorDot, { backgroundColor: getCarColor(car.color) }]} />
            )}
          </>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.carName, { color: C.text }]}>
          {car.year} {car.make} {car.model}
        </Text>
        <View style={styles.meta}>
          {car.licensePlate && (
            <View style={[styles.badge, { backgroundColor: C.backgroundTertiary }]}>
              <Feather name="credit-card" size={11} color={C.textSecondary} />
              <Text style={[styles.badgeText, { color: C.textSecondary }]}>
                {car.licensePlate}
              </Text>
            </View>
          )}
          {car.mileage != null && (
            <View style={[styles.badge, { backgroundColor: C.backgroundTertiary }]}>
              <Feather name="activity" size={11} color={C.textSecondary} />
              <Text style={[styles.badgeText, { color: C.textSecondary }]}>
                {car.mileage.toLocaleString()} km
              </Text>
            </View>
          )}
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={C.textTertiary} />
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
    gap: 6,
  },
  carName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  meta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
