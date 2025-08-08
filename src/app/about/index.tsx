import { AppButton } from "@/components/AppButton";
import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Page() {
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex flex-1" style={{ paddingTop: top }}>
      <Text className="text-2xl font-bold">About Us</Text>
      <Text className="mt-2">We are a team of passionate developers.</Text>

      <Link href="/">
        <AppButton>Go back to Home</AppButton>
      </Link>
    </View>
  );
}
