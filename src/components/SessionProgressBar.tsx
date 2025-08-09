import React, { useMemo } from "react";
import { Pressable, View } from "react-native";

type SectionKey = "intro" | "meditation" | "outro";

export type SessionProgressBarProps = {
  introDuration: number; // seconds
  meditationDuration: number; // seconds (0 if open-ended)
  outroDuration: number; // seconds (0 for now)
  elapsed: number; // seconds
  onSeekTo: (seconds: number, section: SectionKey) => void;
};

export function SessionProgressBar({
  introDuration,
  meditationDuration,
  outroDuration,
  elapsed,
  onSeekTo,
}: SessionProgressBarProps) {
  const { total, introStart, meditationStart, outroStart, progressFrac } =
    useMemo(() => {
      const intro = Math.max(0, introDuration | 0);
      const med = Math.max(0, meditationDuration | 0);
      const outro = Math.max(0, outroDuration | 0);
      const total = Math.max(1, intro + med + outro);

      const introStart = 0;
      const meditationStart = intro;
      const outroStart = intro + med;

      const progressFrac = Math.max(0, Math.min(1, elapsed / total));
      return { total, introStart, meditationStart, outroStart, progressFrac };
    }, [introDuration, meditationDuration, outroDuration, elapsed]);

  const introFlex = Math.max(1, introDuration);
  const medFlex = Math.max(1, meditationDuration);
  const outroFlex = Math.max(1, outroDuration || 1);

  return (
    <View className="w-full mt-4" style={{ height: 18 }}>
      <View className="relative w-full h-full">
        {/* Background segmented bar */}
        <View className="absolute inset-0 flex-row overflow-hidden rounded-full">
          <View className="bg-white/10" style={{ flex: introFlex }} />
          <View className="bg-white/20" style={{ flex: medFlex }} />
          <View className="bg-white/10" style={{ flex: outroFlex }} />
        </View>

        {/* Progress fill overlay */}
        <View
          pointerEvents="none"
          className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full"
          style={{ width: `${progressFrac * 100}%` }}
        />

        {/* Touch targets for each segment */}
        <View className="absolute inset-0 flex-row">
          <Pressable
            accessibilityRole="button"
            onPress={() => onSeekTo(introStart, "intro")}
            style={{ flex: introFlex }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => onSeekTo(meditationStart, "meditation")}
            style={{ flex: medFlex }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => onSeekTo(outroStart, "outro")}
            style={{ flex: outroFlex }}
          />
        </View>
      </View>
    </View>
  );
}
