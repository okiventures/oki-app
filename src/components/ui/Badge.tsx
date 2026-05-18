import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BadgeVariant = 'verified' | 'online' | 'offline' | 'tier' | 'status' | 'count';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, { bg: string; text: string; icon?: string; iconColor: string }> = {
  verified:  { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'checkmark-circle', iconColor: '#1D4ED8' },
  online:    { bg: 'bg-green-100', text: 'text-green-700', icon: 'radio-button-on', iconColor: '#15803D' },
  offline:   { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'radio-button-off', iconColor: '#6B7280' },
  tier:      { bg: 'bg-amber-100', text: 'text-amber-800', iconColor: '#92400E' },
  status:    { bg: 'bg-purple-100', text: 'text-purple-700', iconColor: '#6D28D9' },
  count:     { bg: 'bg-red-100', text: 'text-red-700', iconColor: '#B91C1C' },
};

export function Badge({ variant, label }: BadgeProps) {
  const style = VARIANT_CLASSES[variant];

  return (
    <View className={`flex-row items-center ${style.bg} px-2 py-0.5 rounded-full self-start gap-1`}>
      {style.icon && <Ionicons name={style.icon as never} size={11} color={style.iconColor} />}
      {label && <Text className={`text-[11px] font-semibold ${style.text}`}>{label}</Text>}
    </View>
  );
}
