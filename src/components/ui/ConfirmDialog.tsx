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
  loading?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} onClose={loading ? () => {} : onCancel} title={title}>
      <Text className="mb-5 text-[15px] leading-6 text-gray-700">{message}</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label={cancelLabel}
            onPress={onCancel}
            variant="tertiary"
            disabled={loading}
            fullWidth
          />
        </View>
        <View className="flex-1">
          <Button
            label={confirmLabel}
            onPress={onConfirm}
            variant={danger ? 'danger' : 'primary'}
            loading={loading}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}
