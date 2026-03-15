import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";
import { formatDate, toISODate } from "@/lib/dateUtils";

type Props = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
};

export function DatePickerField({ label, value, onChange, placeholder = "Select date" }: Props) {
  const C = Colors.light;
  const [show, setShow] = useState(false);

  const dateObj = value ? new Date(value + "T12:00:00") : new Date();
  const display = value ? formatDate(value) : "";

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(toISODate(selected));
  };

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
        <View style={[styles.field, { backgroundColor: C.backgroundSecondary, borderColor: C.border }]}>
          <Feather name="calendar" size={16} color={C.textTertiary} />
          <Text style={[styles.displayText, { color: value ? C.text : C.textTertiary }]}>
            {display || placeholder}
          </Text>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%",
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={() => setShow((s) => !s)}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: C.backgroundSecondary,
            borderColor: show ? C.tint : C.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather name="calendar" size={16} color={show ? C.tint : C.textTertiary} />
        <Text style={[styles.displayText, { color: value ? C.text : C.textTertiary }]}>
          {display || placeholder}
        </Text>
        <Feather name={show ? "chevron-up" : "chevron-down"} size={14} color={C.textTertiary} />
      </Pressable>

      {show && (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            mode="date"
            value={dateObj}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
            themeVariant="light"
          />
          {Platform.OS === "ios" && (
            <Pressable
              onPress={() => setShow(false)}
              style={[styles.doneBtn, { backgroundColor: C.tint }]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  displayText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  pickerWrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  doneBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
