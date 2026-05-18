import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export function LoadingSpinner({ label, fullScreen = false, size = 'large' }: LoadingSpinnerProps) {
  const { colors } = useTheme();

  return (
    <View className={`items-center justify-center gap-3 ${fullScreen ? 'flex-1 bg-white' : ''}`}>
      <ActivityIndicator size={size} color={colors.primary['600']} />
      {label && <Text className="text-sm text-gray-500 font-medium">{label}</Text>}
    </View>
  );
}
