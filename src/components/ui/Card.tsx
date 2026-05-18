import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function Card({ children, style, elevated = true }: CardProps) {
  const shadowClass = elevated ? 'shadow-sm elevation-2' : 'border border-gray-100';
  
  return (
    <View
      className={`bg-white rounded-2xl p-4 ${shadowClass}`}
      style={style}
    >
      {children}
    </View>
  );
}
