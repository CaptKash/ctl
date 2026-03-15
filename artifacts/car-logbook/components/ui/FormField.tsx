import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardTypeOptions,
} from "react-native";
import Colors from "@/constants/colors";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  required?: boolean;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  required,
}: Props) {
  const C = Colors.light;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: C.textSecondary }]}>
        {label}{required ? " *" : ""}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[
          styles.input,
          {
            backgroundColor: C.backgroundTertiary,
            color: C.text,
            borderColor: C.border,
            height: multiline ? 80 : 46,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
