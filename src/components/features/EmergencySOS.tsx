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
      className="flex-row items-center justify-between rounded-xl bg-red-600 p-3 shadow-md">
      <View className="flex-row items-center gap-2">
        <View className="rounded-full bg-red-700 p-2">
          <Ionicons name="alert-circle" size={20} color="#FFF" />
        </View>
        <View>
          <Text className="text-[15px] font-bold text-white">Emergency SOS</Text>
          <Text className="mt-0.5 text-[11px] text-red-100">Contact authorities and support</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#FFF" />
    </TouchableOpacity>
  );
}
