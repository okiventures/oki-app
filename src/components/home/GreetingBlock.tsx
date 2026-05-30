import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SearchBar } from '../forms/SearchBar';

interface GreetingBlockProps {
  userName: string;
  searchValue: string;
  onSearchChange: (text: string) => void;
  onFilterPress?: () => void;
}

const GREETING_TEMPLATES = [
  { prefix: 'What do you need fixed today, ', suffix: '?' },
  { prefix: 'How can we help you today, ', suffix: '?' },
  { prefix: 'Looking for a service, ', suffix: '?' },
  { prefix: 'Ready to get things done, ', suffix: '?' },
  { prefix: "What's on your to-do list, ", suffix: '?' },
  { prefix: 'Need a hand with anything, ', suffix: '?' },
  { prefix: "Let's find the right service for you, ", suffix: '.' },
  { prefix: 'Welcome back, ', suffix: "! What's next?" },
  { prefix: 'How can we make your day easier, ', suffix: '?' },
  { prefix: 'Time to check off those tasks, ', suffix: '!' },
];

export function GreetingBlock({
  userName,
  searchValue,
  onSearchChange,
  onFilterPress,
}: GreetingBlockProps) {
  const { colors } = useTheme();
  const firstName = userName.split(' ')[0];

  const greeting = useMemo(() => {
    return GREETING_TEMPLATES[Math.floor(Math.random() * GREETING_TEMPLATES.length)];
  }, []);

  return (
    <View className="mt-5 px-5 pt-1 pb-4">
      <Text
        className="mb-3.5 text-xl leading-tight font-medium"
        style={{ color: colors.ui.text }}
        accessibilityRole="header">
        {greeting.prefix}
        <Text style={{ color: colors.primary['600'] }}>{firstName}</Text>
        {greeting.suffix}
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
