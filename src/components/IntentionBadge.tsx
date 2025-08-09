import React from "react";
import { Text, View } from "react-native";

type Intention = "grounded" | "focus" | "gratitude" | "none";

const colorByIntention: Record<Intention, string> = {
  grounded: "bg-accent-teal/15 border-accent-teal/30 text-accent-teal",
  focus: "bg-accent-blue/15 border-accent-blue/30 text-accent-blue",
  gratitude: "bg-accent-violet/15 border-accent-violet/30 text-accent-violet",
  none: "bg-gray-200 border-gray-300 text-gray-600",
};

export function IntentionBadge({ value }: { value: Intention }) {
  const label = value === "none" ? "Open" : value[0].toUpperCase() + value.slice(1);
  const cls = colorByIntention[value];
  return (
    <View className={`px-3 py-1 rounded-full border ${cls}`}>
      <Text className="text-xs font-semibold">{label}</Text>
    </View>
  );
}
