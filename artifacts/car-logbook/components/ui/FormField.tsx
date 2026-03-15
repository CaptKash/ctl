import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import Colors from "@/constants/colors";

type Props = TextInputProps & {
  label: string;
  required?: boolean;
};

export function FormField({ label, required, multiline, style, ...rest }: Props) {
  const C = Colors.light;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: C.textSecondary }]}>
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
