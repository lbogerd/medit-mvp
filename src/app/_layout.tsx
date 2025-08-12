import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
} from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { Text } from "react-native";
import "../global.css";

export default function Layout() {
  const [loaded] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  if (!loaded) return <Text />;
  return <Slot />;
}
