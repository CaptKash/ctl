import { Feather } from "@expo/vector-icons";
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/context/ThemeContext";
import BottomNav from "@/components/ui/BottomNav";
import { apiPost } from "@/hooks/useApi";

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [modalVisible, setModalVisible] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function openModal() {
    setSuggestion("");
    setName("");
    setEmail("");
    setSent(false);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (suggestion.trim().length < 5) {
      Alert.alert("Too short", "Please describe the tool you'd like in a bit more detail.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/suggest-tool", {
        suggestion: suggestion.trim(),
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      setSent(true);
    } catch {
      Alert.alert("Error", "Couldn't send your suggestion. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.titleRow}>
          <View style={[styles.titleIconBox, { backgroundColor: C.tint + "22" }]}>
            <Feather name="sliders" size={20} color={C.tint} />
          </View>
          <Text style={[styles.headerTitle, { color: C.text }]}>Tools</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.push("/fuel" as any)}
          style={({ pressed }) => [
            styles.tool,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#DBEAFE" }]}>
            <Feather name="droplet" size={24} color="#2563EB" />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text }]}>
              Fuel Consumption
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary }]}>
              Track &amp; monitor fuel usage
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={C.textTertiary} />
        </Pressable>

        <View
          style={[
            styles.tool,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: 0.7 },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="tool" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text }]}>
              Service Cost Tracker
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary }]}>
              Analyse spending over time
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <View
          style={[
            styles.tool,
            { backgroundColor: C.card, shadowColor: C.shadow, opacity: 0.7 },
          ]}
        >
          <View style={[styles.toolIcon, { backgroundColor: "#F3F4F6" }]}>
            <Feather name="bar-chart-2" size={24} color="#9CA3AF" />
          </View>
          <View style={styles.toolBody}>
            <Text style={[styles.toolTitle, { color: C.text }]}>
              Mileage Log
            </Text>
            <Text style={[styles.toolSub, { color: C.textSecondary }]}>
              Record and chart mileage
            </Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        </View>

        <Pressable
          onPress={openModal}
          style={({ pressed }) => [styles.suggestCard, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.suggestIconBox}>
            <Feather name="send" size={20} color="#92400E" />
          </View>
          <View style={styles.toolBody}>
            <Text style={styles.suggestTitle}>Suggest a Tool</Text>
            <Text style={styles.suggestSub}>Got an idea? Let us know what to build next</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#A16207" />
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
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Suggest a Tool</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12}>
                <Feather name="x" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {sent ? (
              <View style={styles.sentContainer}>
                <View style={styles.sentIconBox}>
                  <Feather name="check" size={32} color="#92400E" />
                </View>
                <Text style={[styles.sentTitle, { color: C.text }]}>Thanks for the idea!</Text>
                <Text style={[styles.sentSub, { color: C.textSecondary }]}>
                  We review every suggestion and use them to shape what we build next.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>
                  What tool would you like us to build? *
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="Describe the tool and what problem it solves for you…"
                  placeholderTextColor={C.textTertiary}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={suggestion}
                  onChangeText={setSuggestion}
                  maxLength={800}
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary, marginTop: 20 }]}>
                  Your name (optional)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="e.g. Mohammed"
                  placeholderTextColor={C.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />

                <Text style={[styles.fieldLabel, { color: C.textSecondary, marginTop: 16 }]}>
                  Email (optional — if you'd like a reply)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                  placeholder="you@example.com"
                  placeholderTextColor={C.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Send Suggestion</Text>
                  )}
                </TouchableOpacity>
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 50,
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
