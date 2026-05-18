import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function RatingDisplay({ rating, reviewCount, size = 'md', showCount = true }: RatingDisplayProps) {
  const starSize = { sm: 12, md: 15, lg: 18 }[size];
  const fontSizeClass = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size];
  
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i + 1 <= Math.floor(rating)) return 'star';
    if (i < rating) return 'star-half';
    return 'star-outline';
  });

  return (
    <View className="flex-row items-center gap-1">
      <View className="flex-row gap-0.5">
        {stars.map((icon, i) => (
          <Ionicons key={i} name={icon as never} size={starSize} color="#F59E0B" />
        ))}
      </View>
      <Text className={`${fontSizeClass} font-semibold text-gray-700 ml-0.5`}>
        {rating.toFixed(1)}
      </Text>
      {showCount && reviewCount !== undefined && (
        <Text className="text-xs text-gray-400">({reviewCount})</Text>
      )}
    </View>
  );
}
