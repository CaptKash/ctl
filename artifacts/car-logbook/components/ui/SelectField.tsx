import React, { useState, useMemo } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { registerPicker } from "@/components/ui/selectPickerStore";

type Props = {
  label: string;
  value: string;
  onSelect: (value: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
};

export function SelectField({
  label,
  value,
  onSelect,
  options,
  optionLabels,
  placeholder,
  required,
  disabled,
  allowCustom,
}: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const resolvedPlaceholder = placeholder ?? t("common.select");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const labelOf = (o: string) => optionLabels?.[o] ?? o;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (o) => o.toLowerCase().includes(q) || labelOf(o).toLowerCase().includes(q),
    );
  }, [options, search, optionLabels]);

  const handleOpen = () => {
    if (disabled) return;
    if (Platform.OS === "android") {
      Keyboard.dismiss();
      registerPicker(label, options, value, (selected) => {
        onSelect(selected);
      }, optionLabels);
      router.push("/select-picker");
    } else {
      setOpen(true);
    }
  };

  const handleSelect = (item: string) => {
    onSelect(item);
    setOpen(false);
    setSearch("");
    Keyboard.dismiss();
  };

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: C.textSecondary, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]}>
          {label}
          {required && <Text style={{ color: C.danger }}> *</Text>}
        </Text>
        <Pressable
          onPress={handleOpen}
          style={({ pressed }) => [
            styles.trigger,
            isRTL && { flexDirection: "row-reverse" },
            {
              borderColor: C.border,
              backgroundColor: disabled ? C.backgroundTertiary : C.backgroundSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
        >
          <Text
            style={[
              styles.triggerText,
              { color: value ? C.text : C.textTertiary, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" },
            ]}
            numberOfLines={1}
          >
            {value ? labelOf(value) : resolvedPlaceholder}
          </Text>
          <Feather name="chevron-down" size={17} color={C.textSecondary} />
        </Pressable>
      </View>

      {Platform.OS !== "android" && (
        <Modal
          visible={open}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => { setOpen(false); setSearch(""); }}
        >
          <View style={[styles.modal, { backgroundColor: C.background }]}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 12, borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{label}</Text>
              <Pressable
                onPress={() => { setOpen(false); setSearch(""); }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={20} color={C.textSecondary} />
              </Pressable>
            </View>

            <View style={[styles.searchRow, { borderBottomColor: C.border }]}>
              <View style={[styles.searchBox, { backgroundColor: C.backgroundTertiary }]}>
                <Feather name="search" size={16} color={C.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: C.text, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]}
                  placeholder={allowCustom ? t("common.addField", { label: label.toLowerCase() }) : t("common.searchField", { label: label.toLowerCase() })}
                  placeholderTextColor={C.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                  clearButtonMode="while-editing"
                />
              </View>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.option,
                    isRTL && { flexDirection: "row-reverse" },
                    {
                      backgroundColor: item === value ? C.infoLight : C.backgroundSecondary,
                      borderBottomColor: C.borderLight,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                  accessibilityRole="menuitem"
                >
                  <Text style={[styles.optionText, { flex: 1, color: item === value ? C.tint : C.text, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]}>
                    {labelOf(item)}
                  </Text>
                  {item === value && <Feather name="check" size={16} color={C.tint} />}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={{ color: C.textSecondary }}>{t("common.noResults", { query: search })}</Text>
                </View>
              }
              ListFooterComponent={
                allowCustom && search.trim() && !options.some((o) => o.toLowerCase() === search.trim().toLowerCase()) ? (
                  <Pressable
                    onPress={() => handleSelect(search.trim())}
                    style={({ pressed }) => [
                      styles.option,
                      styles.customOption,
                      { backgroundColor: C.backgroundSecondary, borderBottomColor: C.borderLight, opacity: pressed ? 0.6 : 1 },
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Feather name="plus-circle" size={18} color={C.tint} />
                      <Text style={[styles.optionText, { color: C.tint }]} numberOfLines={1}>
                        {t("common.useValue", { value: search.trim() })}
                      </Text>
                    </View>
                  </Pressable>
                ) : null
              }
            />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  triggerText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },

  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },

  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  customOption: { paddingVertical: 16 },
  empty: { padding: 32, alignItems: "center" },
});
