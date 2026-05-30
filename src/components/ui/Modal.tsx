import React from 'react';
import { View, Text, Modal as RNModal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 justify-center bg-black/50 p-5"
        activeOpacity={1}
        onPress={onClose}>
        <View className="rounded-xl bg-white p-5 shadow-lg" onStartShouldSetResponder={() => true}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-bold text-gray-900">{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close modal">
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </TouchableOpacity>
    </RNModal>
  );
}
