import React, { useState, useMemo, useEffect } from "react";
import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBundledBrandLogo, getRemoteBrandLogoUrl } from "../lib/carBrandLogo";

type Stage = "bundled" | "remote" | "fallback";

interface Props {
  make: string | null | undefined;
  size: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallbackBg?: string;
  fallbackIconColor?: string;
}

export function BrandLogo({
  make,
  size,
  style,
  imageStyle,
  fallbackBg = "#DBEAFE",
  fallbackIconColor = "#2563EB",
}: Props) {
  const normalizedMake = make?.trim() || null;
  const bundled = useMemo(() => getBundledBrandLogo(normalizedMake), [normalizedMake]);
  const remoteUrl = useMemo(() => getRemoteBrandLogoUrl(normalizedMake), [normalizedMake]);
  const initial: Stage = bundled ? "bundled" : remoteUrl ? "remote" : "fallback";
  const [stage, setStage] = useState<Stage>(initial);

  useEffect(() => {
    setStage(initial);
  }, [initial]);

  const dim = { width: size, height: size };

  if (stage === "bundled" && bundled) {
    return (
      <View style={[dim, { alignItems: "center", justifyContent: "center" }, style]}>
        <Image
          source={bundled}
          style={[{ width: size * 0.78, height: size * 0.78 }, imageStyle]}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (stage === "remote" && remoteUrl) {
    return (
      <View style={[dim, { alignItems: "center", justifyContent: "center" }, style]}>
        <Image
          source={{ uri: remoteUrl }}
          style={[{ width: size * 0.78, height: size * 0.78 }, imageStyle]}
          resizeMode="contain"
          onError={() => setStage("fallback")}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        dim,
        { alignItems: "center", justifyContent: "center", backgroundColor: fallbackBg, borderRadius: size * 0.22 },
        style,
      ]}
    >
      <Ionicons name="car-outline" size={Math.round(size * 0.55)} color={fallbackIconColor} />
    </View>
  );
}
