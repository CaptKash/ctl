import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ]);
}

const lighten = (hex: string, t: number) => mix(hex, "#FFFFFF", t);
const darken = (hex: string, t: number) => mix(hex, "#000000", t);

type Props = {
  icon?: keyof typeof Feather.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  containerSize?: number;
  radius?: number;
  bg?: string;
  style?: StyleProp<ViewStyle>;
};

export function MetalIcon({
  icon,
  ionIcon,
  color,
  size = 22,
  containerSize = 44,
  radius = 12,
  bg,
  style,
}: Props) {
  const light = bg ?? lighten(color, 0.82);
  const mid = mix(light, color, 0.55);
  const border = darken(color, 0.28);
  const glyph = darken(color, 0.45);

  return (
    <LinearGradient
      colors={[light, mid, color]}
      locations={[0, 0.55, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: border,
        },
        style,
      ]}
    >
      {ionIcon ? (
        <Ionicons name={ionIcon} size={size} color={glyph} />
      ) : (
        <Feather name={icon!} size={size} color={glyph} />
      )}
    </LinearGradient>
  );
}

export default MetalIcon;
