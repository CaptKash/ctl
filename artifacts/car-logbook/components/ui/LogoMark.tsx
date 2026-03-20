import React from "react";
import Svg, { Rect, Text as SvgText, Polygon } from "react-native-svg";

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 80 }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Rect width="200" height="200" rx="36" fill="#0F2D5E" />
      <Polygon points="122,0 200,0 200,110 122,76" fill="#071A40" />
      <SvgText
        x="18"
        y="124"
        fontFamily="Inter_700Bold"
        fontWeight="bold"
        fontSize="74"
        fill="#FFFFFF"
      >
        CTL
      </SvgText>
      <Rect x="18" y="136" width="94" height="5" rx="2.5" fill="#1D4ED8" />
      <Rect x="118" y="136" width="40" height="5" rx="2.5" fill="#0891B2" />
    </Svg>
  );
}
