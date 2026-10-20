import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  const C = useColors();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  return (
    <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: C.tint }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  action: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
