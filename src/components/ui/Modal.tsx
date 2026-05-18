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
        className="flex-1 bg-black/50 justify-center p-3"
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          className="bg-white rounded-xl p-3 shadow-lg"
          onStartShouldSetResponder={() => true}
        >
          <View className="flex-row items-center justify-between mb-3">
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
