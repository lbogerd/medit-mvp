import { SessionProgressBar } from "@/components/SessionProgressBar";
import {
  AudioSource,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";

// Map intention to intro file; use grounded as default for "none"
const introMap: Record<Intention, AudioSource> = {
  grounded: require("../../../assets/grounded_intro.mp3"),
  focus: require("../../../assets/grounded_intro.mp3"), // TODO: replace with focus-specific if available
  gratitude: require("../../../assets/grounded_intro.mp3"), // TODO: replace with gratitude-specific if available
  none: require("../../../assets/grounded_intro.mp3"), // TODO: replace with open-specific if available
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

const IntentionSchema = z.enum(["grounded", "focus", "gratitude", "none"]);
export type Intention = z.infer<typeof IntentionSchema>;

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
    .preprocess(pickFirst, IntentionSchema.catch("grounded"))
    .optional()
    .default("grounded"),
});

export type Mode = { type: "open" } | z.infer<typeof ParamsSchema>;

export default function SessionScreen() {
  const router = useRouter();
  const raw = useLocalSearchParams<{
    type?: string | string[];
    minutes?: string | string[];
    intention?: Intention | Intention[];
  }>();

  const parsed = ParamsSchema.parse(raw);
  const mode: Mode =
    parsed.type === "open"
      ? { type: "open", intention: parsed.intention }
      : { type: "timed", minutes: parsed.minutes, intention: parsed.intention };

  // setup audio player for intro
  const introSource = introMap[parsed.intention];
  const player = useAudioPlayer(introSource);
  const status = useAudioPlayerStatus(player);

  // ensure playback works with device silent switch
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // track whether the session has started (user click) and if intro has been played once
  const [started, setStarted] = useState(false);
  const introPlayedRef = useRef(false);

  // helper to fade in and play intro
  const fadeInAndPlay = async () => {
    try {
      player.volume = 0;
      player.play();
      const steps = 20,
        dur = 600,
        stepMs = dur / steps;
      for (let i = 1; i <= steps; i++) {
        player.volume = (0.85 * i) / steps;
        await new Promise((r) => setTimeout(r, stepMs));
      }
    } catch (e) {
      console.warn("Intro play failed:", e);
    }
  };

  // when user has started and audio is loaded, play intro once
  useEffect(() => {
    if (!started || !status?.isLoaded || introPlayedRef.current) return;
    introPlayedRef.current = true;
    fadeInAndPlay();
    return () => {
      // pause on unmount
      try {
        player.pause();
      } catch {}
    };
  }, [started, status?.isLoaded]);

  // Track intro duration (in seconds) once loaded and include it in timer
  const [introDurationSec, setIntroDurationSec] = useState(0);
  useEffect(() => {
    if (!status?.isLoaded) return;
    const duration = Number(player.duration ?? 0);

    console.log("Intro duration (seconds):", duration);

    if (Number.isFinite(duration) && duration > 0) {
      setIntroDurationSec(Math.round(duration));
    }
  }, [status?.isLoaded, player.duration]);

  const baseSec = mode.type === "timed" ? Math.max(1, mode.minutes) * 60 : 0;
  const totalSec =
    mode.type === "timed" ? baseSec + introDurationSec : Infinity;

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

  const onPrimaryPress = async () => {
    // first click: start timer + play intro with fade
    if (!started) {
      setStarted(true);
      setPaused(false);
      if (status?.isLoaded) await fadeInAndPlay();
      return;
    }

    // subsequent clicks: toggle pause/resume
    if (paused) {
      setPaused(false);
      try {
        if (
          status?.isLoaded &&
          player.paused &&
          player.currentTime < (player.duration ?? Infinity)
        ) {
          player.play();
        }
      } catch {}
    } else {
      setPaused(true);
      try {
        if (status?.isLoaded && player.playing) {
          player.pause();
        }
      } catch {}
    }
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

  const primaryLabel = !started ? "Start" : paused ? "Continue" : "Pause";

  // Seeking between sections
  const meditationDurationSec = mode.type === "timed" ? baseSec : 0;
  const outroDurationSec = 0; // placeholder until outro is implemented
  const onSeekTo = (
    seconds: number,
    section: "intro" | "meditation" | "outro"
  ) => {
    // Set elapsed to the section start
    setElapsed(seconds);
    // Audio: if intro section, also seek audio to start; otherwise pause intro
    try {
      if (section === "intro" && status?.isLoaded) {
        player.seekTo(0);
        if (!paused && started) player.play();
      } else if (status?.isLoaded) {
        if (player.playing) player.pause();
      }
    } catch {}

    // Auto-unpause if user seeks during an active session (after started)
    if (started) setPaused(false);
  };

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
        <SessionProgressBar
          introDuration={introDurationSec}
          meditationDuration={meditationDurationSec}
          outroDuration={outroDurationSec}
          elapsed={elapsed}
          onSeekTo={onSeekTo}
        />
      </View>

      {/* Controls */}
      <View className="pb-10">
        <Pressable
          onPress={onPrimaryPress}
          className="bg-white/10 rounded-2xl py-4 items-center mb-3 border border-white/10"
        >
          <Text className="text-white text-lg font-medium">{primaryLabel}</Text>
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
