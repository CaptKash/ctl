import React, { useState, useMemo } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Props = {
  label: string;
  value: string;
  onSelect: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function SelectField({
  label,
  value,
  onSelect,
  options,
  placeholder = "Select…",
  required,
  disabled,
}: Props) {
  const C = Colors.light;
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (item: string) => {
    Keyboard.dismiss();
    onSelect(item);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: C.textSecondary }]}>
          {label}
          {required && <Text style={{ color: C.danger }}> *</Text>}
        </Text>
        <Pressable
          onPress={() => !disabled && setOpen(true)}
          style={[
            styles.trigger,
            {
              borderColor: C.border,
              backgroundColor: disabled ? C.backgroundTertiary : C.backgroundSecondary,
            },
          ]}
        >
          <Text
            style={[
              styles.triggerText,
              { color: value ? C.text : C.textTertiary },
            ]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <Feather name="chevron-down" size={17} color={C.textSecondary} />
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: C.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12, borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{label}</Text>
            <Pressable
              onPress={() => { setOpen(false); setSearch(""); }}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Feather name="x" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={[styles.searchRow, { borderBottomColor: C.border }]}>
            <View style={[styles.searchBox, { backgroundColor: C.backgroundTertiary }]}>
              <Feather name="search" size={16} color={C.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: C.text }]}
                placeholder={`Search ${label.toLowerCase()}…`}
                placeholderTextColor={C.textTertiary}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed ? C.backgroundTertiary : C.backgroundSecondary,
                    borderBottomColor: C.borderLight,
                  },
                  item === value && { backgroundColor: C.infoLight },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: item === value ? C.tint : C.text },
                  ]}
                >
                  {item}
                </Text>
                {item === value && (
                  <Feather name="check" size={16} color={C.tint} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ color: C.textSecondary }}>No results for "{search}"</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

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
  empty: { padding: 32, alignItems: "center" },
});
