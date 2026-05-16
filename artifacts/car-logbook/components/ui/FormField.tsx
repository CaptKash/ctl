import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";

type Props = TextInputProps & {
  label: string;
  required?: boolean;
};

export function FormField({ label, required, multiline, style, ...rest }: Props) {
  const C = useColors();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: C.textSecondary, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]}>
        {label}{required ? " *" : ""}
      </Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor={C.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: C.backgroundTertiary,
            color: C.text,
            borderColor: C.border,
            height: multiline ? 80 : 46,
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
  },
});
