import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export function TimerRing({
  size = 260,
  stroke = 14,
  progress, // 0..1
  trackColor = "#f3f4f6",
  progressColor = "#ff6b4d",
}: {
  size?: number;
  stroke?: number;
  progress: number;
  trackColor?: string;
  progressColor?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = useMemo(() => {
    const p = Math.max(0, Math.min(1, progress));
    return [p * c, (1 - p) * c + 1];
  }, [progress, c]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={progressColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={dash.join(",")}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}
