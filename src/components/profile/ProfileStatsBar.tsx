import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface StatItem {
  label: string;
  value: string | number;
}

interface ProfileStatsBarProps {
  stats: StatItem[];
}

export function ProfileStatsBar({ stats }: ProfileStatsBarProps) {
  const { colors } = useTheme();

  return (
    <View
      className="mx-5 flex-row overflow-hidden rounded-2xl"
      style={{
        backgroundColor: colors.ui.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
      }}>
      {stats.map((stat, i) => (
        <View
          key={stat.label}
          className="flex-1 items-center py-3.5"
          style={{
            borderRightWidth: i < stats.length - 1 ? 1 : 0,
            borderRightColor: colors.ui.border,
          }}>
          <Text className="text-[15px] font-bold" style={{ color: colors.primary['600'] }}>
            {stat.value}
          </Text>
          <Text className="mt-0.5 text-[11px] font-normal" style={{ color: colors.ui.textMuted }}>
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
