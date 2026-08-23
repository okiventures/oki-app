import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface ProfileMenuRowProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  badgeLabel?: string;
  danger?: boolean;
  hideDivider?: boolean;
}

export function ProfileMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  badgeLabel,
  danger = false,
  hideDivider = false,
}: ProfileMenuRowProps) {
  const { colors } = useTheme();

  const iconColor = danger ? '#EF4444' : colors.primary['600'];
  const titleColor = danger ? '#EF4444' : colors.ui.text;

  // A row with no handler has nowhere to go. It used to render as a normal
  // tappable row with a chevron and silently do nothing when tapped — dim it
  // and drop the chevron instead, so an unbuilt destination reads as pending
  // rather than broken.
  const isEnabled = typeof onPress === 'function';

  return (
    <Pressable
      onPress={onPress}
      disabled={!isEnabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !isEnabled }}
      android_ripple={isEnabled ? { color: `${colors.primary['600']}10` } : undefined}
      style={({ pressed }) => ({
        opacity: !isEnabled ? 0.45 : pressed ? 0.72 : 1,
      })}
      className={`flex-row items-center px-4 py-3.5 ${hideDivider ? '' : 'border-b border-gray-100'}`}>
      <View className="w-8 items-center justify-center">
        <Ionicons name={icon as never} size={24} color={iconColor} />
      </View>

      <View className="ml-3.5 flex-1">
        <Text className="text-[14px] font-semibold" style={{ color: titleColor }}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="mt-0.5 text-xs font-normal"
            style={{ color: colors.ui.textLight }}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {badgeLabel ? (
        <View
          className="mr-2 rounded-full px-2.5 py-0.5"
          style={{ backgroundColor: `${colors.primary['600']}12` }}>
          <Text className="text-[11px] font-medium" style={{ color: colors.primary['600'] }}>
            {badgeLabel}
          </Text>
        </View>
      ) : null}

      {isEnabled ? <Ionicons name="chevron-forward" size={16} color={colors.ui.textLight} /> : null}
    </Pressable>
  );
}
