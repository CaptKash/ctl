import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  rightText?: string;
  rightSubtext?: string;
  onPress?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
};

export function RecordCard({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  rightText,
  rightSubtext,
  onPress,
  onDelete,
  onComplete,
}: Props) {
  const C = Colors.light;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: C.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {rightText ? (
          <Text style={[styles.rightText, { color: C.text }]}>{rightText}</Text>
        ) : null}
        {rightSubtext ? (
          <Text style={[styles.rightSubtext, { color: C.textTertiary }]}>{rightSubtext}</Text>
        ) : null}
      </View>
      {onComplete && (
        <Pressable
          onPress={onComplete}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="check-circle" size={16} color="#16A34A" />
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="trash-2" size={16} color={C.danger} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  rightText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  rightSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  actionBtn: {
    padding: 4,
  },
});
