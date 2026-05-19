import React from 'react';
import { View, Text, Image } from 'react-native';
import { getInitials } from '../../utils';

interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
  showOnlineDot?: boolean;
  isOnline?: boolean;
}

export function Avatar({ name, photoUrl, size = 44, showOnlineDot = false, isOnline = false }: AvatarProps) {
  const fontSize = size * 0.36;

  return (
    <View style={{ width: size, height: size }} className="relative">
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={`${name} profile photo`}
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className="bg-primary-100 items-center justify-center"
        >
          <Text style={{ fontSize }} className="font-bold text-primary-700">
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnlineDot && (
        <View
          className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
        />
      )}
    </View>
  );
}
