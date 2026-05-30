import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface BookingListSectionProps {
  title: string;
  children: React.ReactNode;
  noHorizontalPadding?: boolean;
}

export function BookingListSection({ title, children, noHorizontalPadding = false }: BookingListSectionProps) {
  const { colors } = useTheme();

  return (
    <View className={`mb-3.5 ${noHorizontalPadding ? '' : 'px-5'}`}>
      <Text
        className={`mb-2.5 text-[15px] font-semibold ${noHorizontalPadding ? 'mx-5' : ''}`}
        style={{ color: colors.ui.text }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
