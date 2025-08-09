import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";

// Map intention to intro file; use grounded as default for "none"
const introMap = {
  grounded: require("../../../assets/grounded_intro.mp3"),
  focus: require("../../../assets/grounded_intro.mp3"), // TODO: replace with focus-specific if available
  gratitude: require("../../../assets/grounded_intro.mp3"), // TODO: replace with gratitude-specific if available
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// Use Zod to normalize/validate params coming as string|string[]
const pickFirst = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const ParamsSchema = z.object({
  type: z
    .preprocess(pickFirst, z.enum(["timed", "open"]).catch("timed"))
    .optional()
    .default("timed"),
  minutes: z
    .preprocess(pickFirst, z.coerce.number().int().positive().catch(10))
    .optional()
    .default(10),
  intention: z
    .preprocess(
      pickFirst,
      z.enum(["grounded", "focus", "gratitude", "none"]).catch("grounded")
    )
    .optional()
    .default("grounded"),
});

export type Mode = { type: "open" } | z.infer<typeof ParamsSchema>;

export default function SessionScreen() {
  const router = useRouter();
  const raw = useLocalSearchParams<{
    type?: string | string[];
    minutes?: string | string[];
    intention?: string | string[];
  }>();

  const parsed = ParamsSchema.parse(raw);
  const mode: Mode =
    parsed.type === "open"
      ? { type: "open", intention: parsed.intention }
      : { type: "timed", minutes: parsed.minutes, intention: parsed.intention };

  // setup audio player for intro (use grounded if "none")
  const introSource =
    parsed.intention === "none"
      ? introMap.grounded
      : introMap[parsed.intention];
  const player = useAudioPlayer(introSource);
  const status = useAudioPlayerStatus(player);

  // ensure playback works with device silent switch
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // play intro once loaded, with gentle fade in
  useEffect(() => {
    if (!status?.isLoaded) return;
    let cancelled = false;

    const fadeInAndPlay = async () => {
      try {
        player.volume = 0;
        player.play();
        const steps = 20,
          dur = 600,
          stepMs = dur / steps;
        for (let i = 1; i <= steps && !cancelled; i++) {
          player.volume = (0.85 * i) / steps;
          await new Promise((r) => setTimeout(r, stepMs));
        }
      } catch (e) {
        console.warn("Intro play failed:", e);
      }
    };

    fadeInAndPlay();
    return () => {
      cancelled = true;

      (async () => {
        try {
          player.pause();
        } catch {}
      })();
    };
  }, [status?.isLoaded]);

  const totalSec =
    mode.type === "timed" ? Math.max(1, mode.minutes) * 60 : Infinity;

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(true);

  // tick every second unless paused or finished
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finished = mode.type === "timed" ? elapsed >= totalSec : false;

  useEffect(() => {
    if (paused || finished) return;
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [paused, finished]);

  // derive display
  const { paddedMinutes, paddedSeconds } = useMemo(() => {
    if (mode.type === "timed") {
      const remaining = Math.max(0, totalSec - elapsed);
      return {
        paddedMinutes: pad(Math.floor(remaining / 60)),
        paddedSeconds: pad(remaining % 60),
      };
    } else {
      return {
        paddedMinutes: pad(Math.floor(elapsed / 60)),
        paddedSeconds: pad(elapsed % 60),
      };
    }
  }, [elapsed, mode, totalSec]);

  useEffect(() => {
    if (finished) {
      // For now just stop the timer; later we’ll trigger outro audio/state
      setPaused(true);
    }
  }, [finished]);

  const onPauseToggle = async () => {
    setPaused((p) => !p);
    // also pause/resume intro if it's still playing
    try {
      if (!status?.isLoaded) return;

      if (!paused && player.playing) {
        player.pause();
      } else if (
        paused &&
        player.paused &&
        player.currentTime < (player.duration ?? Infinity)
      ) {
        player.play();
      }
    } catch {}
  };
  const onFinish = () => {
    setPaused(true);
    // later: navigate to Done with history save + outro
    router.back();
  };

  const intentionLabel =
    parsed.intention === "none"
      ? "Open"
      : parsed.intention[0].toUpperCase() + parsed.intention.slice(1);

  return (
    <View className="flex-1 bg-black px-6 pt-14">
      {/* Top bar */}
      <View className="flex-row justify-between items-center">
        <Text className="text-neutral-400 text-base">Session</Text>
        <Text className="text-neutral-400 text-base">{intentionLabel}</Text>
      </View>

      {/* Timer */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-[80px] font-semibold tracking-widest">
          {paddedMinutes}:{paddedSeconds}
        </Text>
        <Text className="text-neutral-400 mt-2">
          {mode.type === "timed" ? "remaining" : "elapsed"}
        </Text>
      </View>

      {/* Controls */}
      <View className="pb-10">
        <Pressable
          onPress={onPauseToggle}
          className="bg-white/10 rounded-2xl py-4 items-center mb-3 border border-white/10"
        >
          <Text className="text-white text-lg font-medium">
            {paused ? "Continue" : "Pause"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onFinish}
          className="bg-red-500/10 rounded-2xl py-4 items-center border border-red-500/20"
        >
          <Text className="text-red-300 text-base">Finish</Text>
        </Pressable>
      </View>
    </View>
  );
}
