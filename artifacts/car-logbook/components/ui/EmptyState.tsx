import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

type Props = {
  icon?: keyof typeof Feather.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  btnColor?: string;
  btnTextColor?: string;
  btnIcon?: keyof typeof Feather.glyphMap;
};

export function EmptyState({ icon, ionIcon, title, description, actionLabel, onAction, btnColor, btnTextColor, btnIcon }: Props) {
  const C = Colors.light;
  const resolvedBtnColor = btnColor ?? C.tint;
  const resolvedBtnTextColor = btnTextColor ?? "#fff";
  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: C.backgroundTertiary }]}>
        {ionIcon
          ? <Ionicons name={ionIcon} size={32} color={C.textTertiary} />
          : <Feather name={icon!} size={32} color={C.textTertiary} />
        }
      </View>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: C.textSecondary }]}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.btn, { backgroundColor: resolvedBtnColor, opacity: pressed ? 0.85 : 1 }]}
        >
          {btnIcon && <Feather name={btnIcon} size={18} color={resolvedBtnTextColor} />}
          <Text style={[styles.btnText, { color: resolvedBtnTextColor }]}>{actionLabel}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 200,
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
