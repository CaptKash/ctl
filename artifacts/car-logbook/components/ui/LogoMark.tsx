import React from "react";
import Svg, { Rect, Text as SvgText, Path, Circle } from "react-native-svg";

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 80 }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Rect width="200" height="200" rx="36" fill="#080F1E" />

      {/* CTL — upper car body / cabin roofline */}
      <SvgText
        x="100"
        y="116"
        textAnchor="middle"
        fontFamily="Inter_700Bold"
        fontWeight="900"
        fontSize="60"
        fill="#FFFFFF"
      >
        CTL
      </SvgText>

      {/*
        Lower car body — simple stroke only.
        Reading left-to-right (front → rear of car):
          (34,116)  = bottom of C letter  / A-pillar base (windshield foot)
          (22,126)  = windshield base meets bonnet (A-pillar–hood junction)
          (10,130)  = front bumper at sill level
          (190,130) = rear bumper at sill level
          (178,126) = boot lid / rear C-pillar base
          (166,116) = bottom of L letter / rear C-pillar top
      */}
      <Path
        d="M 34 116 L 22 126 L 10 130 L 190 130 L 178 126 L 166 116"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/*
        Wheels — fill matches background so they visually cut wheel-arch
        openings into the sill line through overlap.
        Front wheel: cx=56 (front arch centered under the C cabin edge)
        Rear wheel:  cx=144 (rear arch centered under the L cabin edge)
      */}
      <Circle cx="56"  cy="152" r="22" stroke="#FFFFFF" strokeWidth="3.5" fill="#080F1E" />
      <Circle cx="144" cy="152" r="22" stroke="#FFFFFF" strokeWidth="3.5" fill="#080F1E" />
    </Svg>
  );
}
