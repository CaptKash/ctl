import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/colors";

const { height: SCREEN_H } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, title, children }: Props) {
  const C = Colors.light;
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: C.overlay }]} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: C.backgroundSecondary, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: C.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.close, { color: C.tint }]}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.92,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  close: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});
