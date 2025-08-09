import { Pressable } from "react-native";

export function AppButton({
  fullWidth = false,
  ...props
}: React.ComponentProps<typeof Pressable> & { fullWidth?: boolean }) {
  return (
    <Pressable
      className={`flex h-11 items-center justify-center overflow-hidden rounded-xl bg-white/70 border border-white/60 px-5 py-2 text-sm font-medium text-gray-900 shadow-glass transition-colors active:bg-white/80 focus-visible:outline-none focus-visible:ring-2 ring-sunset-300 disabled:pointer-events-none disabled:opacity-50 ${
        fullWidth ? "w-full" : "w-fit"
      }`}
      role="button"
      {...props}
    >
      {props.children}
    </Pressable>
  );
}
