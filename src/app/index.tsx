import { AppButton } from "@/components/AppButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Page() {
  return (
    <View className="flex flex-1">
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

  // Keep only digits
  const onChangeMinutes = (txt: string) => {
    const digits = txt.replace(/[^0-9]/g, "");
    setMinutesText(digits);
  };

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
      <Text className="text-center text-lg font-bold mt-4">
        Start a new meditation session
      </Text>

      <View className="mt-6 px-6 items-stretch gap-2">
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          Session length (minutes)
        </Text>
        <TextInput
          value={minutesText}
          onChangeText={onChangeMinutes}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={3}
          placeholder="10"
          placeholderTextColor="#9ca3af"
          className="h-11 rounded-md border border-gray-300 dark:border-gray-700 px-3 text-base text-gray-900 dark:text-gray-50 bg-white dark:bg-gray-900"
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          1–180 min
        </Text>
      </View>

      <View className="mt-6 flex flex-col items-center gap-4">
        <Link
          href={{
            pathname: "/session",
            params: {
              type: "timed",
              minutes: minutesValue,
              intention: "grounded",
            },
          }}
          asChild
        >
          <AppButton>Timed</AppButton>
        </Link>
        <Link
          href={{
            pathname: "/session",
            params: { type: "open", intention: "none" },
          }}
          asChild
        >
          <AppButton>Open-ended</AppButton>
        </Link>
      </View>
    </View>
  );
}

function Header() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: top }}>
      <View className="px-4 lg:px-6 h-14 flex items-center flex-row justify-between ">
        <Link className="font-bold flex-1 items-center justify-center" href="/">
          ACME
        </Link>
        <View className="flex flex-row gap-4 sm:gap-6">
          <Link
            className="text-md font-medium hover:underline web:underline-offset-4"
            href="/about"
          >
            About
          </Link>
          <Link
            className="text-md font-medium hover:underline web:underline-offset-4"
            href="/"
          >
            Product
          </Link>
          <Link
            className="text-md font-medium hover:underline web:underline-offset-4"
            href="/"
          >
            Pricing
          </Link>
        </View>
      </View>
    </View>
  );
}

function Footer() {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      className="flex shrink-0 bg-gray-100 native:hidden"
      style={{ paddingBottom: bottom }}
    >
      <View className="py-6 flex-1 items-start px-4 md:px-6 ">
        <Text className={"text-center text-gray-700"}>
          © {new Date().getFullYear()} wtrn.dev
        </Text>
      </View>
    </View>
  );
}
