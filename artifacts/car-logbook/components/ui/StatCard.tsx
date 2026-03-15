import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
};

export function StatCard({ icon, iconColor, iconBg, label, value }: Props) {
  const C = Colors.light;
  return (
    <View style={[styles.card, { backgroundColor: C.card }]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: C.text }]}>{value}</Text>
      <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: "flex-start",
    gap: 8,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
