import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const C = Colors.light;
  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: C.backgroundTertiary }]}>
        <Feather name={icon} size={32} color={C.textTertiary} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: C.textSecondary }]}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.btn, { backgroundColor: C.tint, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  btn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
