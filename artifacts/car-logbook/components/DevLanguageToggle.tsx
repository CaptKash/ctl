import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { setLanguage, type SupportedLanguage } from "@/lib/i18n";

/**
 * Floating dev-only language toggle. Renders a small pill in the top-right
 * (top-left in RTL) of every screen so we can flip EN <-> AR without
 * navigating to Settings during the localization pass. Hidden in production.
 *
 * TODO: remove before TestFlight / store submission.
 */
export function DevLanguageToggle() {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();

  if (!__DEV__) return null;

  const current = (i18n.language as SupportedLanguage) ?? "en";
  const next: SupportedLanguage = current === "ar" ? "en" : "ar";
  const label = current === "ar" ? "EN" : "ع";

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
    >
      <Pressable
        onPress={() => {
          setLanguage(next).catch(() => undefined);
        }}
        hitSlop={8}
        style={({ pressed }) => [
          styles.pill,
          {
            bottom: insets.bottom + 80,
            alignSelf: "center",
            opacity: pressed ? 0.7 : 0.92,
          },
        ]}
      >
        <Text style={styles.text}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    minWidth: 36,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
});
