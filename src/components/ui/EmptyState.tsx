import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View className="mt-16 items-center justify-center px-8">
      <View
        className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${colors.primary['600']}15` }}>
        <Ionicons name={icon as never} size={32} color={colors.primary['600']} />
      </View>
      <Text className="text-center text-base font-semibold" style={{ color: colors.ui.text }}>
        {title}
      </Text>
      <Text className="mt-1.5 text-center text-sm" style={{ color: colors.ui.textLight }}>
        {message}
      </Text>
    </View>
  );
}
