import React from 'react';
import { View, Text } from 'react-native';
import { Avatar } from '../ui/Avatar';
export default function HeroHeader({ location, name, photoUrl }: any) {
  return (
    <View className="flex-row items-center justify-between px-5 pt-10 pb-3">
      <View className="flex-1">
        <Text className="text-[13px] font-medium text-gray-500">Current Location</Text>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Text className="text-[15px] font-bold text-gray-900">{location}</Text>
        </View>
      </View>
      <Avatar name={name} photoUrl={photoUrl} size={32} />
    </View>
  );
}
