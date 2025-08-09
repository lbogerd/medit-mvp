import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

type Mode = { type: "timed"; minutes: number } | { type: "open" };
export type Intention = "grounded" | "focus" | "gratitude" | "none";

// Map intention to intro file; use grounded as default for "none"
const introMap: Record<Exclude<Intention, "none">, any> = {
  grounded: require("../../../assets/grounded_intro.mp3"),
  focus: require("../../../assets/grounded_intro.mp3"), // TODO: replace with focus-specific if available
  gratitude: require("../../../assets/grounded_intro.mp3"), // TODO: replace with gratitude-specific if available
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const {
    type,
    minutes,
    intention: intentionParam,
  } = useLocalSearchParams<{
    type?: string | string[];
    minutes?: string | string[];
    intention?: string | string[];
  }>();

  // Normalize search params from string|string[] to concrete values
  const normalizedType = Array.isArray(type) ? type[0] : type;
  const normalizedMinutes = Array.isArray(minutes) ? minutes[0] : minutes;
  const normalizedIntention = Array.isArray(intentionParam)
    ? intentionParam[0]
    : intentionParam;

  const parsedMinutes = normalizedMinutes
    ? parseInt(normalizedMinutes, 10)
    : NaN;

  const mode: Mode =
    normalizedType === "open"
      ? { type: "open" }
      : {
          type: "timed",
          minutes:
            Number.isFinite(parsedMinutes) && parsedMinutes > 0
              ? parsedMinutes
              : 10,
        };

  const intention: Intention =
    normalizedIntention === "focus" ||
    normalizedIntention === "gratitude" ||
    normalizedIntention === "none"
      ? (normalizedIntention as Intention)
      : "grounded";

  // setup audio player for intro (use grounded if "none")
  const introSource =
    intention === "none"
      ? introMap.grounded
      : introMap[intention as Exclude<Intention, "none">];
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
        await player.play();
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
          await player.pause();
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
        await player.pause();
      } else if (
        paused &&
        player.paused &&
        player.currentTime < (player.duration ?? Infinity)
      ) {
        await player.play();
      }
    } catch {}
  };
  const onFinish = () => {
    setPaused(true);
    // later: navigate to Done with history save + outro
    router.back();
  };

  const intentionLabel =
    intention === "none"
      ? "Open"
      : intention[0].toUpperCase() + intention.slice(1);

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
