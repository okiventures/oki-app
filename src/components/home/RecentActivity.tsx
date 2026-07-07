import React from 'react';
import { View, Text } from 'react-native';
import { RecentActivityRow } from '../../mocks/dashboard';
import { useTheme } from '../../context/ThemeContext';
import { BookingCard } from '../cards/BookingCard';
import { Button } from '../ui/Button';

interface RecentActivityProps {
  rows: RecentActivityRow[];
  onViewHistory?: () => void;
  onReport?: (rowId: string) => void;
  onReview?: (rowId: string) => void;
}

export function RecentActivity({ rows, onViewHistory, onReport, onReview }: RecentActivityProps) {
  const { colors } = useTheme();

  if (!rows.length) return null;

  return (
    <View className="mx-5 mb-5">
      <Text className="mb-2.5 text-sm font-semibold" style={{ color: colors.ui.text }}>
        Recent Activity
      </Text>
      <View className="gap-1">
        {rows.map((row) => (
          <BookingCard
            key={row.id}
            booking={row}
            onReport={onReport ? () => onReport(row.id) : undefined}
            onReview={onReview ? () => onReview(row.id) : undefined}
          />
        ))}
      </View>
      <View className="mt-3">
        <Button
          label="View History"
          variant="tertiary"
          fullWidth
          onPress={onViewHistory || (() => {})}
        />
      </View>
    </View>
  );
}
