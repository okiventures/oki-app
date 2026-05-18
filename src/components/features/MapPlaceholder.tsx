import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MapPlaceholderProps {
  height?: number;
}

export function MapPlaceholder({ height = 200 }: MapPlaceholderProps) {
  return (
    <View
      style={{ height }}
      className="relative items-center justify-center overflow-hidden rounded-2xl bg-blue-50">
      {/* Visual elements to simulate a map */}
      <View className="absolute inset-0 border border-blue-100 opacity-50" />
      <View className="absolute top-1/4 left-1/4 h-1 w-32 rotate-45 bg-gray-200" />
      <View className="absolute top-1/2 left-1/2 h-1 w-48 -rotate-12 bg-gray-200" />

      <View className="z-10 items-center">
        <Ionicons name="map-outline" size={32} color="#3B82F6" />
        <Text className="mt-2 text-sm font-semibold text-blue-700">Map Interface Mock</Text>
        <Text className="mt-0.5 text-xs text-blue-500">Real map integration pending</Text>
      </View>

      {/* Mock Pins */}
      <View className="absolute top-1/3 left-1/3">
        <Ionicons name="pin" size={24} color="#EF4444" />
      </View>
      <View className="absolute right-1/3 bottom-1/3">
        <Ionicons name="pin" size={24} color="#10B981" />
      </View>
    </View>
  );
}
