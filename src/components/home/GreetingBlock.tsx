import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SearchBar } from '../forms/SearchBar';

interface GreetingBlockProps {
  userName: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  onFilterPress?: () => void;
}

export function GreetingBlock({
  userName,
  searchValue,
  onSearchChange,
  onFilterPress,
}: GreetingBlockProps) {
  const { colors } = useTheme();
  const firstName = userName.split(' ')[0];

  return (
    <View className="mt-5 px-5 pt-1 pb-4">
      <Text
        className="mb-3.5 text-xl leading-tight font-medium"
        style={{ color: colors.ui.text }}
        accessibilityRole="header">
        {'What do you need fixed today, '}
        <Text style={{ color: colors.primary['600'] }}>{firstName}</Text>
        {'?'}
      </Text>

      <SearchBar
        value={searchValue}
        onChangeText={onSearchChange}
        placeholder="Search for a service…"
        onFilterPress={onFilterPress}
      />
    </View>
  );
}
