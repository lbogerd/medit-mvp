import React from "react";
import { Pressable, PressableProps } from "react-native";

export function IconButton({
  className,
  ...props
}: PressableProps & { className?: string }) {
  return (
    <Pressable
      role="button"
      {...props}
      className={`h-12 w-12 rounded-full items-center justify-center bg-white/70 border border-white/60 shadow-glass active:bg-white/80 ${
        className ?? ""
      }`}
    />
  );
}
