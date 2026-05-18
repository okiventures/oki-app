import React from 'react';
import { View, Text } from 'react-native';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }: ConfirmDialogProps) {
  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <Text className="text-[15px] text-gray-700 leading-6 mb-5">{message}</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label={cancelLabel} onPress={onCancel} variant="tertiary" fullWidth />
        </View>
        <View className="flex-1">
          <Button label={confirmLabel} onPress={onConfirm} variant={danger ? 'danger' : 'primary'} fullWidth />
        </View>
      </View>
    </Modal>
  );
}
