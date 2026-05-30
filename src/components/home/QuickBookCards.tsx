import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickBookMode } from '../../mocks/dashboard';
import { useTheme } from '../../context/ThemeContext';

interface QuickBookCardsProps {
  modes: QuickBookMode[];
  onModePress?: (mode: QuickBookMode) => void;
}

interface QuickBookCardProps {
  mode: QuickBookMode;
  onPress?: () => void;
  primaryColor: string;
  primaryLight: string;
}

function QuickBookCard({ mode, onPress, primaryColor, primaryLight }: QuickBookCardProps) {
  const { colors } = useTheme();
  const accentColor = mode.type === 'now' ? primaryColor : mode.accentColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={`${mode.title} — starting at ₱${mode.startingPrice}`}
      className="flex-1 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: accentColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}>
      {/* Background watermark icon */}
      <Ionicons
        name={mode.iconName as never}
        size={120}
        color="#FFFFFF"
        style={{
          position: 'absolute',
          right: -35,
          top: -10,
          opacity: 0.12,
        }}
      />

      {/* Card content */}
      <View className="flex-1 p-3.5 pt-5">
        <Text className="mb-1 text-[15px] font-semibold text-white">
          {mode.title}
        </Text>
        <Text
          className="text-xs font-normal leading-tight text-white/90"
          numberOfLines={2}>
          {mode.description}
        </Text>
      </View>

      {/* Price footer */}
      <View
        className="px-3.5 py-2.5"
        style={{ backgroundColor: colors.ui.surface }}>
        <Text className="text-xs font-medium" style={{ color: colors.ui.textMuted }}>
          Starts at{' '}
          <Text style={{ color: accentColor, fontWeight: '600' }}>₱{mode.startingPrice}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function QuickBookCards({ modes, onModePress }: QuickBookCardsProps) {
  const { colors } = useTheme();

  return (
    <View className="mx-5 mb-5">
      <Text
        className="mb-2.5 text-sm font-medium"
        style={{ color: colors.ui.text }}>
        How do you want to book?
      </Text>
      <View className="flex-row gap-2.5">
        {modes.map((mode) => (
          <QuickBookCard
            key={mode.id}
            mode={mode}
            primaryColor={colors.primary['600']}
            primaryLight={colors.primary['300']}
            onPress={() => onModePress?.(mode)}
          />
        ))}
      </View>
    </View>
  );
}
