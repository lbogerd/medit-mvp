import { BlurView } from "expo-blur";
import React from "react";
import { Platform, View, ViewProps } from "react-native";

export function GlassSurface({ style, children, ...rest }: ViewProps) {
  const content = (
    <View
      style={style}
      {...rest}
      className={
        "rounded-2xl border border-white/60 shadow-glass bg-white/60 overflow-hidden"
      }
    >
      {children}
    </View>
  );

  // On native, wrap with BlurView for frosted effect
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return (
      <BlurView intensity={40} tint="light" style={{ borderRadius: 16 }}>
        {content}
      </BlurView>
    );
  }

  // Web relies on CSS .glass class from global.css via tailwind className
  return (
    <View className="glass rounded-2xl border shadow-glass" style={style}>
      {children}
    </View>
  );
}
