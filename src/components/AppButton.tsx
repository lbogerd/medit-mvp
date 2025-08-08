import { Pressable } from "react-native";

export function AppButton({
  fullWidth = false,
  ...props
}: React.ComponentProps<typeof Pressable> & { fullWidth?: boolean }) {
  return (
    <Pressable
      className={`flex h-9 items-center justify-center overflow-hidden rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 web:shadow ios:shadow transition-colors hover:bg-gray-900/90 active:bg-gray-400/90 web:focus-visible:outline-none web:focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300 ${
        fullWidth ? "w-full" : "w-fit"
      }`}
      role="button"
      {...props}
    >
      {props.children}
    </Pressable>
  );
}
