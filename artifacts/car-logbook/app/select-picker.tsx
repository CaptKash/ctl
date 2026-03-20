import React, { useState, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getPickerState, resolvePickerSelection } from "@/components/ui/selectPickerStore";

export default function SelectPickerScreen() {
  const C = Colors.light;
  const insets = useSafeAreaInsets();
  const { label, options, value } = getPickerState();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (item: string) => {
    resolvePickerSelection(item);
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text }]}>{label}</Text>
        <View style={styles.closeBtn} />
      </View>

      <View style={[styles.searchRow, { borderBottomColor: C.border }]}>
        <View style={[styles.searchBox, { backgroundColor: C.backgroundTertiary }]}>
          <Feather name="search" size={16} color={C.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder={`Search ${label.toLowerCase()}…`}
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item)}
            activeOpacity={0.6}
            style={[
              styles.option,
              {
                backgroundColor: item === value ? C.infoLight : C.backgroundSecondary,
                borderBottomColor: C.borderLight,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: item === value ? C.tint : C.text }]}>
              {item}
            </Text>
            {item === value && <Feather name="check" size={16} color={C.tint} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: C.textSecondary }}>No results for "{search}"</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
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
  empty: { padding: 32, alignItems: "center" },
});
