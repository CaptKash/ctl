import React, { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/context/ThemeContext";

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
};

export function PhotoPicker({ photos, onChange, max = 6 }: Props) {
  const C = useColors();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [viewingUri, setViewingUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t("photoPicker.permissionTitle"),
        useCamera
          ? t("photoPicker.permissionCamera")
          : t("photoPicker.permissionLibrary")
      );
      return;
    }

    const editing = Platform.OS === "ios";
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: editing,
          aspect: [4, 3],
          quality: 0.65,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: editing,
          aspect: [4, 3],
          quality: 0.65,
          base64: true,
          allowsMultipleSelection: false,
        });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      onChange([...photos, uri]);
    }
  };

  const showPicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t("photoPicker.cancel"),
            t("photoPicker.takePhoto"),
            t("photoPicker.chooseFromLibrary"),
          ],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickImage(true);
          if (index === 2) pickImage(false);
        }
      );
    } else {
      Alert.alert(t("photoPicker.addPhoto"), t("photoPicker.chooseSource"), [
        { text: t("photoPicker.cancel"), style: "cancel" },
        { text: t("photoPicker.takePhoto"), onPress: () => pickImage(true) },
        { text: t("photoPicker.chooseFromLibrary"), onPress: () => pickImage(false) },
      ]);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(t("photoPicker.removeTitle"), t("photoPicker.removeConfirm"), [
      { text: t("photoPicker.cancel"), style: "cancel" },
      {
        text: t("photoPicker.remove"),
        style: "destructive",
        onPress: () => {
          const updated = [...photos];
          updated.splice(index, 1);
          onChange(updated);
        },
      },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: C.textSecondary, textAlign: isRTL ? "right" : "left" }]}>{t("photoPicker.label")}</Text>
      <View style={[styles.grid, isRTL && { flexDirection: "row-reverse" }]}>
        {photos.map((uri, i) => (
          <Pressable
            key={i}
            onPress={() => setViewingUri(uri)}
            onLongPress={() => removePhoto(i)}
            style={styles.thumb}
          >
            <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
            <Pressable
              onPress={() => removePhoto(i)}
              style={[styles.removeBtn, { backgroundColor: C.danger }]}
              hitSlop={4}
            >
              <Feather name="x" size={11} color="#fff" />
            </Pressable>
          </Pressable>
        ))}

        {photos.length < max && (
          <Pressable
            onPress={showPicker}
            style={({ pressed }) => [
              styles.addThumb,
              {
                borderColor: C.border,
                backgroundColor: pressed ? C.backgroundTertiary : C.backgroundSecondary,
              },
            ]}
          >
            <Feather name="camera" size={22} color={C.textSecondary} />
            <Text style={[styles.addText, { color: C.textSecondary }]}>
              {photos.length === 0 ? t("photoPicker.addPhoto") : t("photoPicker.add")}
            </Text>
          </Pressable>
        )}
      </View>
      {photos.length > 0 && (
        <Text style={[styles.hint, { color: C.textTertiary, textAlign: isRTL ? "right" : "left" }]}>
          {t("photoPicker.hint")}
        </Text>
      )}

      <Modal
        visible={!!viewingUri}
        animationType="fade"
        onRequestClose={() => setViewingUri(null)}
        statusBarTranslucent
      >
        <View style={styles.photoModal}>
          <Pressable onPress={() => setViewingUri(null)} style={styles.photoModalClose} hitSlop={12}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          {viewingUri && (
            <Image source={{ uri: viewingUri }} style={styles.photoFull} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const THUMB = 96;

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: "visible",
  },
  thumbImg: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
  },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  addThumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  photoModal: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  photoModalClose: {
    position: "absolute",
    top: 56,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoFull: { width: "100%", height: "80%" },
});
