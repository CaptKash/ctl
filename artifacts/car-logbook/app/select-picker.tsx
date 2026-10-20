import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { SwipeBackView } from "@/components/ui/SwipeBackView";
import { getPickerState, resolvePickerSelection } from "@/components/ui/selectPickerStore";

const ITEM_HEIGHT = 52;

export default function SelectPickerScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { label, options, value, optionLabels } = getPickerState();
  const [search, setSearch] = useState("");
  const listRef = useRef<FlatList>(null);

  const labelOf = (o: string) => optionLabels?.[o] ?? o;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (o) => o.toLowerCase().includes(q) || labelOf(o).toLowerCase().includes(q),
    );
  }, [options, search]);

  useEffect(() => {
    if (!value || Platform.OS === "web") return;
    const idx = options.findIndex((o) => o === value);
    if (idx > 2) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.3 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelect = (item: string) => {
    resolvePickerSelection(item);
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SwipeBackView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, isRTL && { flexDirection: "row-reverse" }, { paddingTop: insets.top + 12, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.text }]}>{label}</Text>
        <View style={styles.closeBtn} />
      </View>

      <View style={[styles.searchRow, { borderBottomColor: C.border }]}>
        <View style={[styles.searchBox, isRTL && { flexDirection: "row-reverse" }, { backgroundColor: C.backgroundTertiary }]}>
          <Feather name="search" size={16} color={C.textSecondary} style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: C.text, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]}
            placeholder={t("common.searchField", { label: label.toLowerCase() })}
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus={false}
          />
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        initialNumToRender={30}
        maxToRenderPerBatch={30}
        windowSize={10}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        onScrollToIndexFailed={() => {}}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelect(item)}
            activeOpacity={0.6}
            style={[
              styles.option,
              isRTL && { flexDirection: "row-reverse" },
              {
                backgroundColor: item === value ? C.infoLight : C.backgroundSecondary,
                borderBottomColor: C.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.optionText,
                {
                  flex: 1,
                  color: item === value ? C.tint : C.text,
                  textAlign: isRTL ? "right" : "left",
                  writingDirection: isRTL ? "rtl" : "ltr",
                },
              ]}
            >
              {labelOf(item)}
            </Text>
            {item === value && <Feather name="check" size={16} color={C.tint} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: C.textSecondary }}>{t("common.noResults", { query: search })}</Text>
          </View>
        }
      />
    </SwipeBackView>
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
