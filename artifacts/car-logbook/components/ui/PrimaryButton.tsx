import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "danger-light" | "ghost";
  icon?: React.ComponentProps<typeof Feather>["name"];
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = "primary", icon }: Props) {
  const C = Colors.light;
  const bgColor =
    variant === "danger" ? C.danger :
    variant === "danger-light" ? "#FEE2E2" :
    variant === "ghost" ? "transparent" : C.tint;
  const textColor =
    variant === "ghost" ? C.tint :
    variant === "danger-light" ? "#DC2626" : "#fff";
  const borderColor = variant === "ghost" ? C.tint : bgColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === "ghost" ? 1.5 : 0,
          opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.inner}>
          {icon && <Feather name={icon} size={17} color={textColor} />}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
