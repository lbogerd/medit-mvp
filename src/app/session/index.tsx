import { ConfirmModal } from "@/components/ConfirmModal";
import { EtherealBackground } from "@/components/EtherealBackground";
import { IntentionBadge } from "@/components/IntentionBadge";
import { SessionProgressBar } from "@/components/SessionProgressBar";
import { TimerRing } from "@/components/TimerRing";
import {
  AudioSource,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { z } from "zod";

// Map intention to intro file; use grounded as default for "none"
const introMap: Record<Intention, AudioSource> = {
  grounded: require("../../../assets/grounded_intro.mp3"),
  focus: require("../../../assets/grounded_intro.mp3"), // TODO: replace with focus-specific if available
  gratitude: require("../../../assets/grounded_intro.mp3"), // TODO: replace with gratitude-specific if available
  none: require("../../../assets/grounded_intro.mp3"), // TODO: replace with open-specific if available
};

// Map intention to outro file; default to grounded outro when unknown
const outroMap: Record<Intention, AudioSource> = {
  grounded: require("../../../assets/grounded_outro.mp3"),
  focus: require("../../../assets/grounded_outro.mp3"),
  gratitude: require("../../../assets/grounded_outro.mp3"),
  none: require("../../../assets/grounded_outro.mp3"),
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

const IntentionSchema = z.enum(["grounded", "focus", "gratitude", "none"]);
export type Intention = z.infer<typeof IntentionSchema>;

// Intention accent colors
const accentByIntention: Record<Intention, string> = {
  grounded: "#14b8a6", // teal
  focus: "#3b82f6", // blue
  gratitude: "#8b5cf6", // violet
  none: "#ff6b4d", // default to sunset accent
};

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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const introSource = voiceEnabled ? introMap[parsed.intention] : (null as any);
  const player = useAudioPlayer(introSource);
  const status = useAudioPlayerStatus(player);

  // setup audio player for outro
  const outroSource = voiceEnabled ? outroMap[parsed.intention] : (null as any);
  const outroPlayer = useAudioPlayer(outroSource);
  const outroStatus = useAudioPlayerStatus(outroPlayer);

  // ensure playback works with device silent switch
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // general cleanup on unmount: pause any playing audio
  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {}
      try {
        outroPlayer.pause();
      } catch {}
    };
  }, []);

  // track whether the session has started (user click) and if intro has been played once
  const [started, setStarted] = useState(false);
  const introPlayedRef = useRef(false);
  const outroStartedRef = useRef(false);

  // helper to fade in and play intro
  const fadeInAndPlay = async () => {
    try {
      if (!voiceEnabled) return;
      player.volume = 0;
      player.play();
      const steps = 20;
      const dur = 600;
      const stepMs = dur / steps;
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
    if (
      !voiceEnabled ||
      !started ||
      !status?.isLoaded ||
      introPlayedRef.current
    )
      return;
    introPlayedRef.current = true;
    fadeInAndPlay();
    return () => {
      try {
        player.pause();
      } catch {}
    };
  }, [started, status?.isLoaded, voiceEnabled]);

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

  // Track outro duration (in seconds)
  const [outroDurationSec, setOutroDurationSec] = useState(0);
  useEffect(() => {
    if (!outroStatus?.isLoaded) return;
    const duration = Number(outroPlayer.duration ?? 0);
    if (Number.isFinite(duration) && duration > 0) {
      setOutroDurationSec(Math.round(duration));
    }
  }, [outroStatus?.isLoaded, outroPlayer.duration]);

  const baseSec = mode.type === "timed" ? Math.max(1, mode.minutes) * 60 : 0;
  const totalSec =
    mode.type === "timed"
      ? baseSec + (voiceEnabled ? introDurationSec + outroDurationSec : 0)
      : Infinity;

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

  // derived section boundaries
  const meditationStartSec = voiceEnabled ? introDurationSec : 0;
  const outroStartSec =
    (voiceEnabled ? introDurationSec : 0) +
    (mode.type === "timed" ? baseSec : 0);

  // If we cross into meditation, ensure intro is paused
  useEffect(() => {
    if (!voiceEnabled || !status?.isLoaded) return;
    if (elapsed >= meditationStartSec && player.playing) {
      try {
        player.pause();
      } catch {}
    }
  }, [elapsed, meditationStartSec, status?.isLoaded, voiceEnabled]);

  // Auto-play outro when entering outro section for timed sessions
  // (moved above) outroStartedRef tracks first start of outro
  const fadeInAndPlayOutro = async () => {
    try {
      outroPlayer.volume = 0;
      outroPlayer.play();
      const steps = 20,
        dur = 600,
        stepMs = dur / steps;
      for (let i = 1; i <= steps; i++) {
        outroPlayer.volume = (0.85 * i) / steps;
        await new Promise((r) => setTimeout(r, stepMs));
      }
    } catch (e) {
      console.warn("Outro play failed:", e);
    }
  };

  useEffect(() => {
    if (
      !started ||
      paused ||
      mode.type !== "timed" ||
      !voiceEnabled ||
      !outroStatus?.isLoaded ||
      outroDurationSec <= 0
    )
      return;
    // if we are within the outro window and haven't started it yet
    if (
      elapsed >= outroStartSec &&
      elapsed < outroStartSec + outroDurationSec &&
      !outroStartedRef.current
    ) {
      outroStartedRef.current = true;
      fadeInAndPlayOutro();
    }
  }, [
    started,
    paused,
    elapsed,
    outroStatus?.isLoaded,
    outroDurationSec,
    outroStartSec,
    mode.type,
  ]);

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

  const resetAudioFlags = () => {
    introPlayedRef.current = false;
    outroStartedRef.current = false;
    try {
      if (voiceEnabled && status?.isLoaded) {
        // Seek intro back to start so it can replay
        player.seekTo(0);
        player.pause();
      }
      if (voiceEnabled && outroStatus?.isLoaded) {
        outroPlayer.seekTo(0);
        outroPlayer.pause();
      }
    } catch {}
  };

  // When toggling voice guidance on after it was off, allow intro to play again.
  useEffect(() => {
    if (!voiceEnabled) return; // only care when enabling
    // If user has not progressed beyond intro phase we can replay it
    if (elapsed < meditationStartSec) {
      introPlayedRef.current = false;
    }
  }, [voiceEnabled]);

  const onPrimaryPress = async () => {
    // first click: start timer + play intro with fade
    if (!started) {
      setStarted(true);
      setPaused(false);

      // ensure flags are reset for a brand new start
      resetAudioFlags();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (voiceEnabled && status?.isLoaded) await fadeInAndPlay();

      return;
    }

    // subsequent clicks: toggle pause/resume
    if (paused) {
      setPaused(false);
      Haptics.selectionAsync().catch(() => {});
      try {
        const inIntro = elapsed < meditationStartSec;
        const inOutro =
          mode.type === "timed" &&
          elapsed >= outroStartSec &&
          elapsed < outroStartSec + outroDurationSec;

        if (
          inIntro &&
          voiceEnabled &&
          status?.isLoaded &&
          player.paused &&
          player.currentTime < (player.duration ?? Infinity)
        ) {
          player.play();
        } else if (
          inOutro &&
          voiceEnabled &&
          outroStatus?.isLoaded &&
          outroPlayer.paused &&
          outroPlayer.currentTime < (outroPlayer.duration ?? Infinity)
        ) {
          outroPlayer.play();
        }
      } catch {}
    } else {
      setPaused(true);
      Haptics.selectionAsync().catch(() => {});

      try {
        if (voiceEnabled && status?.isLoaded && player.playing) player.pause();
        if (voiceEnabled && outroStatus?.isLoaded && outroPlayer.playing)
          outroPlayer.pause();
      } catch {}
    }
  };
  const onFinish = () => {
    if (!finished) {
      setShowConfirm(true);
      return;
    }
    setPaused(true);
    router.navigate("/");
  };

  const intentionLabel =
    parsed.intention === "none"
      ? "Open"
      : parsed.intention[0].toUpperCase() + parsed.intention.slice(1);

  const primaryLabel = !started ? "Start" : paused ? "Continue" : "Pause";

  // Seeking between sections
  const meditationDurationSec = mode.type === "timed" ? baseSec : 0;
  const onSeekTo = (
    seconds: number,
    section: "intro" | "meditation" | "outro"
  ) => {
    // Set elapsed to the section start
    setElapsed(seconds);
    // Audio: if intro section, also seek audio to start; otherwise pause intro
    try {
      if (voiceEnabled && section === "intro" && status?.isLoaded) {
        player.seekTo(0);

        // allow intro to replay when seeking back
        introPlayedRef.current = false;

        if (!paused && started) player.play();
        if (voiceEnabled && outroStatus?.isLoaded && outroPlayer.playing)
          outroPlayer.pause();
      } else if (section === "meditation") {
        if (voiceEnabled && status?.isLoaded && player.playing) player.pause();
        if (voiceEnabled && outroStatus?.isLoaded && outroPlayer.playing)
          outroPlayer.pause();
      } else if (section === "outro") {
        if (voiceEnabled && status?.isLoaded && player.playing) player.pause();
        if (voiceEnabled && outroStatus?.isLoaded) {
          outroPlayer.seekTo(0);
          if (!paused && started) outroPlayer.play();
        }
      }
    } catch {}

    // Auto-unpause if user seeks during an active session (after started)
    if (started) setPaused(false);
  };

  return (
    <View className="flex-1 bg-sunset-50">
      <EtherealBackground />

      {/* Top bar */}
      <View className="px-6 pt-14 flex-row justify-between items-center">
        <Text className="text-base text-gray-700">Session</Text>
        <IntentionBadge value={parsed.intention} />
      </View>

      {/* Timer + Ring */}
      <View className="flex-1 items-center justify-center px-6">
        <TimerRing
          size={280}
          stroke={16}
          progress={mode.type === "timed" ? Math.min(1, elapsed / totalSec) : 0}
          trackColor="#f3f4f6"
          progressColor={accentByIntention[parsed.intention]}
        />
        <View className="absolute items-center">
          <Text className="text-6xl font-semibold text-gray-900">
            {paddedMinutes}:{paddedSeconds}
          </Text>
          <Text className="text-gray-600 mt-1">
            {mode.type === "timed" ? "remaining" : "elapsed"}
          </Text>
        </View>

        <SessionProgressBar
          introDuration={voiceEnabled ? introDurationSec : 0}
          meditationDuration={meditationDurationSec}
          outroDuration={voiceEnabled ? outroDurationSec : 0}
          elapsed={elapsed}
          onSeekTo={onSeekTo}
          progressColor={accentByIntention[parsed.intention]}
        />
      </View>

      {/* Controls */}
      <View className="px-6 pb-10 gap-3">
        <Pressable
          onPress={onPrimaryPress}
          className="rounded-full py-4 items-center border border-white/60 bg-white/70 shadow-glass"
        >
          <Text className="text-gray-900 text-lg font-medium">
            {primaryLabel}
          </Text>
        </Pressable>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Switch value={voiceEnabled} onValueChange={setVoiceEnabled} />
            <Text className="text-gray-700">Voice guidance</Text>
          </View>

          <Pressable
            onPress={onFinish}
            className="rounded-full py-2 px-4 items-center border border-red-200 bg-red-50/70"
          >
            <Text className="text-red-600 text-base">Finish</Text>
          </Pressable>
        </View>
      </View>

      <ConfirmModal
        visible={showConfirm}
        title="Finish session?"
        message="Your session isn’t complete yet. Are you sure you want to finish?"
        confirmText="Finish"
        cancelText="Keep going"
        onConfirm={() => {
          setShowConfirm(false);
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
          setPaused(true);
          router.navigate("/");
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}
