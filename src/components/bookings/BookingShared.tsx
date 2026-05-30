import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text className="mb-2 text-sm font-semibold" style={{ color: colors.ui.text }}>
      {label}
    </Text>
  );
}
