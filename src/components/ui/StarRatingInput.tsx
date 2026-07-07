import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingInputProps {
  rating: number;
  onChange: (rating: number) => void;
  size?: number;
}

export function StarRatingInput({ rating, onChange, size = 32 }: StarRatingInputProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= rating;
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            android_ripple={{ color: 'rgba(245, 158, 11, 0.15)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            className="rounded-full p-1">
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
          </Pressable>
        );
      })}
    </View>
  );
}
