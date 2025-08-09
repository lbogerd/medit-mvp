import { AppButton } from "@/components/AppButton";
import { EtherealBackground } from "@/components/EtherealBackground";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";

export default function Page() {
  return (
    <View className="flex flex-1 bg-sunset-50">
      <EtherealBackground />
      <Header />
      <Content />
      <Footer />
    </View>
  );
}

function Content() {
  const [minutesText, setMinutesText] = useState<string>("");

  // Load saved preference
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("pref:minutes");
        if (stored) setMinutesText(String(stored));
        else setMinutesText("10");
      } catch {
        setMinutesText("10");
      }
    })();
  }, []);

  // Slider will drive the minutes; keep text for persistence only

  // Parsed + clamped value used for navigation
  const minutesValue = useMemo(() => {
    const n = parseInt(minutesText || "", 10);
    if (!Number.isFinite(n)) return 10;
    return Math.max(1, Math.min(180, n));
  }, [minutesText]);

  // Persist changes (debounced-ish via effect)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!alive) return;
        await AsyncStorage.setItem("pref:minutes", String(minutesValue));
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [minutesValue]);

  return (
    <View className="flex-1">
      <View className="mt-8 px-6 items-center">
        <Text className="text-2xl font-semibold text-gray-900">Serenity</Text>
        <Text className="text-base text-gray-600 mt-1">Find your calm, one breath at a time.</Text>
      </View>

      <View className="mt-8 px-6">
        <View className="rounded-2xl border border-white/60 bg-white/70 shadow-glass p-5">
          <Text className="text-sm text-gray-700">Session length</Text>
          <View className="flex-row justify-between items-end mt-2">
            <Text className="text-4xl font-semibold text-gray-900">{minutesValue}</Text>
            <Text className="text-gray-600 mb-1">minutes</Text>
          </View>
          <Slider
            value={minutesValue}
            minimumValue={1}
            maximumValue={180}
            step={1}
            onValueChange={(v) => setMinutesText(String(v))}
            minimumTrackTintColor="#ff6b4d"
            maximumTrackTintColor="#ffd2c5"
            thumbTintColor="#ff6b4d"
            style={{ marginTop: 12 }}
          />
          <Text className="text-xs text-gray-500 mt-2">1–180 minutes</Text>
        </View>
      </View>

      <View className="mt-8 flex items-center">
        <Link
          href={{ pathname: "/session", params: { type: "timed", minutes: minutesValue, intention: "grounded" } }}
          asChild
        >
          <AppButton>
            <Text>Begin guided session</Text>
          </AppButton>
        </Link>
      </View>
    </View>
  );
}

function Header() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: top }}>
      <View className="px-4 h-16 flex-row items-center justify-between">
        <Link className="font-semibold text-lg" href="/">Serenity</Link>
        <View className="flex-row gap-4">
          <Link className="text-md text-gray-700" href="/about">About</Link>
        </View>
      </View>
    </View>
  );
}

function Footer() {
  const { bottom } = useSafeAreaInsets();
  return (
    <View className="flex shrink-0 native:hidden" style={{ paddingBottom: bottom }}>
      <View className="py-6 items-start px-4">
        <Text className="text-center text-gray-600">© {new Date().getFullYear()} Serenity</Text>
      </View>
    </View>
  );
}
