import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  className?: string;
}

export function Card({ children, style, elevated = true, className = '' }: CardProps) {
  const shadowClass = elevated ? 'border border-gray-200' : 'bg-gray-50';
  
  return (
    <View
      className={`bg-white rounded-2xl p-4 ${shadowClass} ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}
