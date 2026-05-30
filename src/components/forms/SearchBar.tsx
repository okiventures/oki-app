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
      {/* Search Input Container */}
      <View
        className="flex-1 flex-row items-center gap-2 rounded-xl border px-3 py-2.5"
        style={{
          backgroundColor: colors.ui.surface,
          borderColor: focused ? colors.primary['400'] : colors.ui.border,
        }}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0AEA8"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-sm font-normal"
          style={
            {
              color: colors.ui.text,
              outlineStyle: 'none',
              backgroundColor: 'transparent',
            } as any
          }
          underlineColorAndroid="transparent"
          returnKeyType="search"
          accessibilityLabel={placeholder}
        />
        {onLocationPress && (
          <TouchableOpacity
            onPress={onLocationPress}
            accessibilityLabel="Use current location"
            className="ml-1">
            <Ionicons name="location-outline" size={18} color={colors.primary['600']} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Button */}
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          accessibilityLabel="Open filters"
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.primary['600'] }}>
          <Ionicons name="options-outline" size={20} color={colors.ui.surface} />
        </TouchableOpacity>
      )}
    </View>
  );
}
