import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmergencySOSProps {
  onPress: () => void;
}

export function EmergencySOS({ onPress }: EmergencySOSProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel="Trigger Emergency SOS"
      className="flex-row items-center justify-between rounded-2xl bg-red-600 p-4 shadow-md">
      <View className="flex-row items-center gap-3">
        <View className="rounded-full bg-red-700 p-2">
          <Ionicons name="alert-circle" size={24} color="#FFF" />
        </View>
        <View>
          <Text className="text-[15px] font-bold text-white">Emergency SOS</Text>
          <Text className="mt-0.5 text-xs text-red-100">Contact authorities and support</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#FFF" />
    </TouchableOpacity>
  );
}
