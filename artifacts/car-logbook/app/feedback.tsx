import { Feather } from "@expo/vector-icons";
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
import { apiPost } from "@/hooks/useApi";
import { SwipeBackView } from "@/components/ui/SwipeBackView";

const CATEGORIES = [
  { id: "Bug Report",        icon: "alert-circle" as const,  color: "#DC2626", bg: "#FEE2E2" },
  { id: "Feature Request",   icon: "star" as const,          color: "#D97706", bg: "#FEF3C7" },
  { id: "General Feedback",  icon: "message-circle" as const,color: "#2563EB", bg: "#DBEAFE" },
  { id: "Other",             icon: "more-horizontal" as const,color: "#6B7280", bg: "#F3F4F6" },
];

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
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
      Alert.alert("Something went wrong", "Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeBackView style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: C.border, backgroundColor: C.card }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="chevron-left" size={26} color={C.tint} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Send Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      {done ? (
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: "#D1FAE5" }]}>
            <Feather name="check-circle" size={36} color="#059669" />
          </View>
          <Text style={[styles.successTitle, { color: C.text }]}>Thanks for the feedback!</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            Your message has been sent. We read every piece of feedback and use it to improve CTL.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: C.tint }]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>CATEGORY</Text>
          <View style={styles.categoryGrid}>
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
                  ]}
                >
                  <Feather name={cat.icon} size={16} color={active ? cat.color : C.textSecondary} />
                  <Text style={[styles.categoryLabel, { color: active ? cat.color : C.textSecondary }]}>
                    {cat.id}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 20 }]}>YOUR MESSAGE</Text>
          <View style={[styles.textAreaWrap, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us what's on your mind — bugs, ideas, or anything else…"
              placeholderTextColor={C.textTertiary}
              multiline
              textAlignVertical="top"
              style={[styles.textArea, { color: C.text }]}
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: C.textTertiary }]}>
              {message.length}/2000
            </Text>
          </View>

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[
              styles.submitBtn,
              { backgroundColor: canSubmit ? C.tint : C.border },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitText}>Send Feedback</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.hint, { color: C.textTertiary }]}>
            Feedback is sent directly to the CTL team. We may follow up at your account email address.
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
