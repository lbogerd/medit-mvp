import React from "react";
import { Modal, Text, View } from "react-native";
import { AppButton } from "./AppButton";
import { GlassSurface } from "./GlassSurface";

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Finish",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/10">
        <GlassSurface style={{ width: "86%", padding: 20 }}>
          <Text className="text-lg font-semibold mb-2">{title}</Text>
          <Text className="text-gray-700 mb-6">{message}</Text>
          <View className="flex-row justify-end gap-3">
            <AppButton onPress={onCancel}>
              <Text> {cancelText} </Text>
            </AppButton>
            <AppButton onPress={onConfirm}>
              <Text> {confirmText} </Text>
            </AppButton>
          </View>
        </GlassSurface>
      </View>
    </Modal>
  );
}
