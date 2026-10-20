import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";
import { useTranslation } from "react-i18next";
import { apiPost } from "@/hooks/useApi";
import { SwipeBackView } from "@/components/ui/SwipeBackView";

const CATEGORIES = [
  { id: "Bug Report",        labelKey: "feedback.categories.bug",     icon: "alert-circle" as const,  color: "#DC2626", bg: "#FEE2E2" },
  { id: "Feature Request",   labelKey: "feedback.categories.feature", icon: "star" as const,          color: "#D97706", bg: "#FEF3C7" },
  { id: "General Feedback",  labelKey: "feedback.categories.general", icon: "message-circle" as const,color: "#2563EB", bg: "#DBEAFE" },
  { id: "Other",             labelKey: "feedback.categories.other",   icon: "more-horizontal" as const,color: "#6B7280", bg: "#F3F4F6" },
];

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [category, setCategory] = useState("General Feedback");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = message.trim().length >= 5 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await apiPost("/feedback", { category, message: message.trim() });
      setDone(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t("feedback.errorTitle"), t("feedback.errorBody"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeBackView style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }, isRTL && { flexDirection: "row-reverse" }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.backBtn, isRTL && { alignItems: "flex-end" }]}>
          <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={26} color={C.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t("feedback.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {done ? (
        <View style={styles.successWrap}>
          <MetalIcon icon="check-circle" color="#059669" bg="#D1FAE5" size={36} style={styles.successIcon} />
          <Text style={[styles.successTitle, { color: C.text }]}>{t("feedback.thanksTitle")}</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            {t("feedback.thanksSub")}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: C.tint }]}
          >
            <Text style={styles.doneBtnText}>{t("common.done")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("feedback.categoryLabel")}</Text>
          <View style={[styles.categoryGrid, isRTL && { flexDirection: "row-reverse" }]}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategory(cat.id);
                  }}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: active ? cat.bg : C.card, borderColor: active ? cat.color : C.border },
                    isRTL && { flexDirection: "row-reverse" },
                  ]}
                >
                  <Feather name={cat.icon} size={16} color={active ? cat.color : C.textSecondary} />
                  <Text style={[styles.categoryLabel, { color: active ? cat.color : C.textSecondary }]}>
                    {t(cat.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 20, textAlign: isRTL ? "right" : "left" }]}>{t("feedback.messageLabel")}</Text>
          <View style={[styles.textAreaWrap, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t("feedback.placeholder")}
              placeholderTextColor={C.textTertiary}
              multiline
              textAlignVertical="top"
              style={[styles.textArea, { color: C.text, textAlign: isRTL ? "right" : "left", writingDirection: isRTL ? "rtl" : "ltr" }]}
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: C.textTertiary, textAlign: isRTL ? "left" : "right" }]}>
              {message.length}/2000
            </Text>
          </View>

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? C.tint : C.border },
              isRTL && { flexDirection: "row-reverse" },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitText}>{t("feedback.send")}</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.hint, { color: C.textTertiary }]}>
            {t("feedback.hint")}
          </Text>
        </ScrollView>
      )}
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
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  content: { padding: 20, gap: 10 },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  categoryLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  textAreaWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 180,
  },
  textArea: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 140,
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 8,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },

  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
