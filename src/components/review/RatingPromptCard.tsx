import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface RatingPromptCardProps {
  targetName: string;
  serviceCategory: string;
  onRate: () => void;
  onDismiss?: () => void;
}

/**
 * Compact banner shown once per completed booking per actor when the booking
 * reaches PAID. Links to the review screen for the booking.
 */
export function RatingPromptCard({
  targetName,
  serviceCategory,
  onRate,
  onDismiss,
}: RatingPromptCardProps) {
  const { colors } = useTheme();

  return (
    <View
      className="mx-5 mb-5 overflow-hidden rounded-2xl border"
      style={{
        backgroundColor: colors.ui.surface,
        borderColor: colors.ui.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}>
      <View
        className="flex-row items-center gap-2 px-4 pt-3.5 pb-2.5"
        style={{ backgroundColor: '#FFFBEB' }}>
        <View
          className="h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F59E0B' }}>
          <Ionicons name="star" size={15} color="#FFF" />
        </View>
        <Text className="flex-1 text-[14px] font-semibold text-amber-800">
          How was your experience?
        </Text>
        {onDismiss && (
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            className="rounded-full p-1">
            <Ionicons name="close" size={16} color="#B45309" />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onRate}
        android_ripple={{ color: 'rgba(245, 158, 11, 0.12)', borderless: false }}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        className="flex-row items-center gap-3 px-4 py-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colors.primary['500']}15` }}>
          <Ionicons name="star-outline" size={18} color={colors.primary['600']} />
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-semibold" style={{ color: colors.ui.text }}>
            Rate {targetName}
          </Text>
          <Text className="mt-0.5 text-[12px]" style={{ color: colors.ui.textMuted }}>
            {serviceCategory}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.ui.textLight} />
      </Pressable>
    </View>
  );
}
