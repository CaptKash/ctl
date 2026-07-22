import { Feather } from "@expo/vector-icons";
import { MetalIcon } from "@/components/ui/MetalIcon";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";
import { useSubscription } from "@/context/SubscriptionContext";
import BottomNav from "@/components/ui/BottomNav";
import { apiPost } from "@/hooks/useApi";

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { isFleet } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [modalVisible, setModalVisible] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function openModal() {
    setSuggestion("");
    setSent(false);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (suggestion.trim().length < 5) {
      Alert.alert(t("tools.suggest.tooShortTitle"), t("tools.suggest.tooShortMessage"));
      return;
    }
    setLoading(true);
    try {
      await apiPost("/suggest-tool", {
        suggestion: suggestion.trim(),
      });
      setSent(true);
    } catch {
      Alert.alert(t("tools.suggest.errorTitle"), t("tools.suggest.errorMessage"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={[styles.titleRow, isRTL && { flexDirection: "row-reverse" }]}>
          <MetalIcon icon="sliders" color={C.tint} size={20} style={[styles.titleIconBox, isRTL && { marginRight: 0, marginLeft: 12 }]} />
          <Text style={[styles.headerTitle, { color: C.text }]}>{t("tools.title")}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.push("/nearby-service")}
          style={({ pressed }) => [
            styles.tool,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MetalIcon icon="map-pin" color="#059669" bg="#ECFDF5" size={24} style={styles.toolIcon} />
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.nearby.title")}
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.nearby.sub")}
            </Text>
          </View>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.textTertiary} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/fuel")}
          style={({ pressed }) => [
            styles.tool,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MetalIcon icon="droplet" color="#2563EB" bg="#DBEAFE" size={24} style={styles.toolIcon} />
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.fuel.title")}
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.fuel.sub")}
            </Text>
          </View>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.textTertiary} />
        </Pressable>

        <Pressable
          onPress={() => isFleet ? router.push("/service-costs") : router.push("/fleet-upgrade")}
          style={({ pressed }) => [
            styles.tool,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MetalIcon icon="dollar-sign" color={isFleet ? "#7C3AED" : "#9CA3AF"} bg={isFleet ? "#F3E8FF" : "#F3F4F6"} size={24} style={styles.toolIcon} />
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.cost.title")}
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.cost.sub")}
            </Text>
          </View>
          {isFleet
            ? <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.textTertiary} />
            : <View style={[styles.fleetBadge, isRTL && { flexDirection: "row-reverse" }]}><Feather name="lock" size={10} color="#92400E" /><Text style={styles.fleetBadgeText}>{t("tools.fleetBadge")}</Text></View>
          }
        </Pressable>

        <Pressable
          onPress={() => isFleet ? router.push("/export") : router.push("/fleet-upgrade")}
          style={({ pressed }) => [
            styles.tool,
            isRTL && { flexDirection: "row-reverse" },
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MetalIcon icon="download" color={isFleet ? "#D97706" : "#9CA3AF"} bg={isFleet ? "#FEF3C7" : "#F3F4F6"} size={24} style={styles.toolIcon} />
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text, textAlign: isRTL ? "right" : "left" }]}>{t("tools.export.title")}</Text>
            <Text style={[styles.toolSub, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
              {t("tools.export.sub")}
            </Text>
          </View>
          {isFleet
            ? <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={C.textTertiary} />
            : <View style={[styles.fleetBadge, isRTL && { flexDirection: "row-reverse" }]}><Feather name="lock" size={10} color="#92400E" /><Text style={styles.fleetBadgeText}>{t("tools.fleetBadge")}</Text></View>
          }
        </Pressable>

        <Pressable
          onPress={openModal}
          style={({ pressed }) => [styles.suggestCard, isRTL && { flexDirection: "row-reverse" }, { opacity: pressed ? 0.85 : 1 }]}
        >
          <MetalIcon icon="send" color="#92400E" bg="#FDE047" size={20} style={styles.suggestIconBox} />
          <View style={styles.toolBody}>
            <Text style={[styles.suggestTitle, isRTL && { textAlign: "right" }]}>{t("tools.suggest.title")}</Text>
            <Text style={[styles.suggestSub, isRTL && { textAlign: "right" }]}>{t("tools.suggest.sub")}</Text>
          </View>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color="#A16207" />
        </Pressable>
      </ScrollView>

      <BottomNav active="tools" />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContainer, { backgroundColor: C.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: C.border }, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t("tools.suggest.title")}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                <Feather name="x" size={22} color={C.textSecondary} />
              </Pressable>
            </View>

            {sent ? (
              <View style={styles.sentContainer}>
                <MetalIcon icon="check" color="#92400E" bg="#FDE047" size={32} style={styles.sentIconBox} />
                <Text style={[styles.sentTitle, { color: C.text }]}>{t("tools.suggest.sentTitle")}</Text>
                <Text style={[styles.sentSub, { color: C.textSecondary }]}>
                  {t("tools.suggest.sentSub")}
                </Text>
                <Pressable style={({ pressed }) => [styles.doneBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.doneBtnText}>{t("tools.suggest.done")}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.fieldLabel, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                  {t("tools.suggest.fieldLabel")}
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: C.card, color: C.text, borderColor: C.border, textAlign: isRTL ? "right" : "left" }]}
                  placeholder={t("tools.suggest.placeholder")}
                  placeholderTextColor={C.textTertiary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={suggestion}
                  onChangeText={setSuggestion}
                  maxLength={800}
                />

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, { opacity: loading ? 0.6 : pressed ? 0.85 : 1 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>{t("tools.suggest.send")}</Text>
                  )}
                </Pressable>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 24 },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 80,
  },
  toolIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBody: { flex: 1, gap: 3 },
  toolTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  toolSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  comingSoonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#6B7280",
  },
  fleetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
  },
  fleetBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#92400E",
  },
  suggestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    padding: 18,
    minHeight: 80,
    backgroundColor: "#FEF9C3",
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  suggestIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDE047",
  },
  suggestTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#78350F",
  },
  suggestSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    color: "#92400E",
  },
  modalWrapper: { flex: 1 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modalContent: {
    padding: 24,
    paddingBottom: 48,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    lineHeight: 22,
  },
  submitBtn: {
    marginTop: 28,
    backgroundColor: "#D97706",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  sentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  sentIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#FDE047",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  sentTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  sentSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  doneBtn: {
    marginTop: 12,
    backgroundColor: "#D97706",
    borderRadius: 14,
    paddingHorizontal: 40,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
