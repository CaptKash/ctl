import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors, useTheme } from "@/context/ThemeContext";
import { formatDate, toISODate } from "@/lib/dateUtils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type Props = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
};

function CustomCalendar({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (iso: string) => void;
  onDone: () => void;
}) {
  const C = useColors();
  const today = new Date();
  const initial = value ? new Date(value + "T12:00:00") : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const selectedDate = value ? new Date(value + "T12:00:00") : null;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day, 12, 0, 0);
    onChange(toISODate(d));
  };

  const isSelected = (day: number) =>
    selectedDate &&
    selectedDate.getFullYear() === viewYear &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  // Build grid cells: nulls for blank leading cells, then day numbers
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const yearRange: number[] = [];
  for (let y = today.getFullYear() - 10; y <= today.getFullYear() + 15; y++) {
    yearRange.push(y);
  }

  return (
    <View style={[calStyles.wrap, { backgroundColor: C.card, borderColor: C.border }]}>
      {/* Month / Year header */}
      <View style={calStyles.header}>
        <Pressable onPress={prevMonth} hitSlop={8} style={calStyles.navBtn}>
          <Feather name="chevron-left" size={20} color={C.text} />
        </Pressable>

        <Pressable
          onPress={() => setShowYearPicker(v => !v)}
          style={calStyles.monthYearBtn}
          hitSlop={4}
        >
          <Text style={[calStyles.monthYear, { color: C.text }]}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <Feather name={showYearPicker ? "chevron-up" : "chevron-down"} size={14} color={C.textSecondary} />
        </Pressable>

        <Pressable onPress={nextMonth} hitSlop={8} style={calStyles.navBtn}>
          <Feather name="chevron-right" size={20} color={C.text} />
        </Pressable>
      </View>

      {showYearPicker ? (
        /* Year picker grid */
        <ScrollView style={calStyles.yearScrollWrap} contentContainerStyle={calStyles.yearGrid}>
          {yearRange.map(y => (
            <Pressable
              key={y}
              onPress={() => { setViewYear(y); setShowYearPicker(false); }}
              style={[
                calStyles.yearCell,
                { backgroundColor: y === viewYear ? C.tint : C.backgroundSecondary },
              ]}
            >
              <Text style={[calStyles.yearText, { color: y === viewYear ? "#fff" : C.text }]}>
                {y}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <>
          {/* Day-of-week labels */}
          <View style={calStyles.dayRow}>
            {DAY_LABELS.map(d => (
              <Text key={d} style={[calStyles.dayLabel, { color: C.textTertiary }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={calStyles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`blank-${idx}`} style={calStyles.cell} />;
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <Pressable
                  key={`day-${day}`}
                  onPress={() => selectDay(day)}
                  style={[
                    calStyles.cell,
                    sel && { backgroundColor: C.tint, borderRadius: 20 },
                    !sel && tod && { borderWidth: 1.5, borderColor: C.tint, borderRadius: 20 },
                  ]}
                >
                  <Text style={[
                    calStyles.dayNum,
                    { color: sel ? "#fff" : tod ? C.tint : C.text },
                    sel && { fontFamily: "Inter_600SemiBold" },
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Done button */}
      <Pressable
        onPress={onDone}
        style={[calStyles.doneBtn, { backgroundColor: C.tint }]}
      >
        <Text style={calStyles.doneBtnText}>Done</Text>
      </Pressable>
    </View>
  );
}

export function DatePickerField({ label, value, onChange, placeholder = "Select date" }: Props) {
  const C = useColors();
  const { resolvedTheme } = useTheme();
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
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 15,
              fontFamily: "Inter_400Regular, system-ui, sans-serif",
              color: value ? (resolvedTheme === "dark" ? "#F9FAFB" : "#111827") : "#9CA3AF",
              outline: "none",
              cursor: "pointer",
              padding: 0,
              minWidth: 0,
              width: "100%",
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
        onPress={() => {
          Keyboard.dismiss();
          setShow((s) => !s);
        }}
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
        Platform.OS === "ios" ? (
          <CustomCalendar
            value={value}
            onChange={onChange}
            onDone={() => setShow(false)}
          />
        ) : (
          <View style={[styles.pickerWrap, { backgroundColor: C.card, borderColor: C.border }]}>
            <DateTimePicker
              mode="date"
              value={dateObj}
              display="default"
              onChange={handleChange}
              themeVariant={resolvedTheme}
            />
          </View>
        )
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
    position: "relative",
    overflow: "hidden",
  },
  displayText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  pickerWrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingBottom: 8,
  },
});

const calStyles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingTop: 10,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthYearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  monthYear: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  dayRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    gap: 0,
  },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  yearScrollWrap: {
    maxHeight: 220,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 4,
  },
  yearCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: "center",
  },
  yearText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  doneBtn: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
