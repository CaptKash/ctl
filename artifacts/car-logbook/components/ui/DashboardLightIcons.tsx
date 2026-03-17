import React from "react";
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Ellipse,
  Text as SvgText,
} from "react-native-svg";

export interface DashboardLightConfig {
  id: string;
  label: string;
  warningColor: string;
}

export const DASHBOARD_LIGHTS: DashboardLightConfig[] = [
  { id: "checkEngine", label: "Check Engine", warningColor: "#FFE000" },
  { id: "oil", label: "Oil Pressure", warningColor: "#FF1744" },
  { id: "battery", label: "Battery", warningColor: "#FFE000" },
  { id: "temp", label: "Engine Temp", warningColor: "#FF1744" },
  { id: "abs", label: "ABS", warningColor: "#FFE000" },
  { id: "airbag", label: "Airbag / SRS", warningColor: "#FFE000" },
  { id: "brake", label: "Brake System", warningColor: "#FF1744" },
  { id: "tpms", label: "Tyre Pressure", warningColor: "#FFE000" },
  { id: "fuel", label: "Fuel Low", warningColor: "#FFE000" },
  { id: "service", label: "Service Due", warningColor: "#FFE000" },
  { id: "stability", label: "Stability / ESP", warningColor: "#FFE000" },
  { id: "steering", label: "Power Steering", warningColor: "#FFE000" },
];

const SW = 1.0;

interface IconProps {
  color: string;
  size: number;
}

function CheckEngineIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M3 11 L5 9 H8 V7 H16 V9 H19 L21 11 V15 L19 16 H16 V18 H8 V16 H5 L3 15 V11 Z"
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d="M13.5 10 L11 13.5 H13.2 L11.5 17 L16 13 H13.5 L15.5 10 Z"
        fill={color}
      />
    </Svg>
  );
}

function OilIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M7 12 C7 9 9.2 7 12 7 C14.8 7 17 9 17 12 V18 C17 18.6 16.6 19 16 19 H8 C7.4 19 7 18.6 7 18 V12 Z"
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M15 9 L20 7 L20 11 L17 12"
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8.5 C12 8.5 10 11.5 10 13 C10 14.1 10.9 15 12 15 C13.1 15 14 14.1 14 13 C14 11.5 12 8.5 12 8.5 Z"
        fill={color}
      />
    </Svg>
  );
}

function BatteryIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="2" y="7" width="17" height="10" rx="2" fill="none" stroke={color} strokeWidth={SW} />
      <Rect x="19" y="10" width="3" height="4" rx="1" fill={color} />
      <Line x1="13" y1="10" x2="13" y2="14" stroke={color} strokeWidth={SW + 0.2} strokeLinecap="round" />
      <Line x1="11" y1="12" x2="15" y2="12" stroke={color} strokeWidth={SW + 0.2} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="9" y2="12" stroke={color} strokeWidth={SW + 0.2} strokeLinecap="round" />
    </Svg>
  );
}

function TempIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M12 3 C10.3 3 9 4.3 9 6 V14.2 C7.8 15.1 7 16.5 7 18 C7 20.8 9.2 23 12 23 C14.8 23 17 20.8 17 18 C17 16.5 16.2 15.1 15 14.2 V6 C15 4.3 13.7 3 12 3 Z"
        fill="none"
        stroke={color}
        strokeWidth={SW}
      />
      <Line x1="9" y1="7" x2="11" y2="7" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="9" y1="9.5" x2="11" y2="9.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="9" y1="12" x2="11" y2="12" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Circle cx="12" cy="18" r="2.5" fill={color} />
      <Line x1="12" y1="15.5" x2="12" y2="13" stroke={color} strokeWidth={SW + 0.2} strokeLinecap="round" />
    </Svg>
  );
}

function ABSIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth={SW} />
      <SvgText
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="bold"
        fill={color}
        fontFamily="Arial"
      >
        ABS
      </SvgText>
    </Svg>
  );
}

function AirbagIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="4.5" r="2.5" fill="none" stroke={color} strokeWidth={SW} />
      <Path
        d="M9 7 L8 13 L10 14 L12 20 L14 14 L16 13 L15 7"
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Ellipse cx="12" cy="12" rx="5" ry="4.5" fill="none" stroke={color} strokeWidth={SW} />
    </Svg>
  );
}

function BrakeIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth={SW} />
      <Circle cx="12" cy="12" r="5" fill="none" stroke={color} strokeWidth={SW} />
      <Line x1="12" y1="6.5" x2="12" y2="13" stroke={color} strokeWidth={SW + 0.3} strokeLinecap="round" />
      <Circle cx="12" cy="15.5" r="1.3" fill={color} />
    </Svg>
  );
}

function TPMSIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M12 2 C7.6 2 4 5.6 4 10 C4 14.4 7.6 18 12 18 C16.4 18 20 14.4 20 10 C20 5.6 16.4 2 12 2 Z"
        fill="none"
        stroke={color}
        strokeWidth={SW + 0.5}
      />
      <Circle cx="12" cy="10" r="4" fill="none" stroke={color} strokeWidth={SW} />
      <Path
        d="M8 18 C8 20 10 22 12 22 C14 22 16 20 16 18"
        fill="none"
        stroke={color}
        strokeWidth={SW + 0.5}
        strokeLinecap="round"
      />
      <Line x1="12" y1="5.5" x2="12" y2="9" stroke={color} strokeWidth={SW + 0.2} strokeLinecap="round" />
      <Circle cx="12" cy="11" r="1" fill={color} />
    </Svg>
  );
}

function FuelIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x="3" y="7" width="11" height="14" rx="2" fill="none" stroke={color} strokeWidth={SW} />
      <Line x1="5" y1="16" x2="12" y2="16" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Path
        d="M14 10 L17 8 L20 9 L20 17 C20 18 19 18 19 18 L17 18"
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="20" y1="9" x2="22" y2="9" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function ServiceIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        fill="none"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StabilityIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M5 9 H19 V15 H5 Z" fill="none" stroke={color} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M5 9 L7 6 H17 L19 9" fill="none" stroke={color} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M6 17 C7 17 7 19 8 19 C9 19 9 17 10 17" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M14 17 C15 17 15 19 16 19 C17 19 17 17 18 17" fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

function SteeringIcon({ color, size }: IconProps) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth={SW} />
      <Circle cx="12" cy="12" r="2.5" fill="none" stroke={color} strokeWidth={SW} />
      <Line x1="12" y1="3" x2="12" y2="9.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="4.5" y1="16" x2="10" y2="13" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Line x1="19.5" y1="16" x2="14" y2="13" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

const ICON_MAP: Record<string, (props: IconProps) => JSX.Element> = {
  checkEngine: CheckEngineIcon,
  oil: OilIcon,
  battery: BatteryIcon,
  temp: TempIcon,
  abs: ABSIcon,
  airbag: AirbagIcon,
  brake: BrakeIcon,
  tpms: TPMSIcon,
  fuel: FuelIcon,
  service: ServiceIcon,
  stability: StabilityIcon,
  steering: SteeringIcon,
};

interface DashboardIconProps {
  id: string;
  color: string;
  size?: number;
}

export function DashboardIcon({ id, color, size = 28 }: DashboardIconProps) {
  const Component = ICON_MAP[id];
  if (!Component) return null;
  return <Component color={color} size={size} />;
}
