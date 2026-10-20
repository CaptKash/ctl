import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "danger-light" | "ghost" | "metallic-blue";
  icon?: React.ComponentProps<typeof Feather>["name"];
  testID?: string;
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = "primary", icon, testID }: Props) {
  const C = useColors();

  if (variant === "metallic-blue") {
    const textColor = "#312E81";
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.btn,
          styles.metallicWrap,
          { opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
        ]}
      >
        <LinearGradient
          colors={["#DBEAFE", "#BFDBFE", "#93C5FD"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.metallicFill, { borderColor: "#1E40AF" }]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <View style={styles.inner}>
              {icon && <Feather name={icon} size={17} color={textColor} />}
              <Text style={[styles.label, { color: textColor }]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

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
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
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
  metallicWrap: {
    overflow: "hidden",
    padding: 0,
  },
  metallicFill: {
    flex: 1,
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
});
