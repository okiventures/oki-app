import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onLocationPress?: () => void;
  onFilterPress?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search services or handymen…',
  onLocationPress,
  onFilterPress,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`flex-1 flex-row items-center rounded-xl border bg-gray-50 ${focused ? 'border-primary-400' : 'border-gray-200'} px-3 py-2.5`}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-[15px] text-gray-900"
          returnKeyType="search"
        />
        {onLocationPress && (
          <TouchableOpacity onPress={onLocationPress} accessibilityLabel="Use current location">
            <Ionicons name="location-outline" size={18} color={colors.primary['600']} />
          </TouchableOpacity>
        )}
      </View>
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          accessibilityLabel="Open filters"
          className="bg-primary-600 rounded-xl p-3">
          <Ionicons name="options-outline" size={18} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}
