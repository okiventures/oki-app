import React, { useMemo } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils';
import { EarningsDateRangeFilter, Preset } from './EarningsDateRangeFilter';
import { EarningsTrendChart } from './EarningsTrendChart';
import { useEarnings } from '../../hooks/useEarnings';
import {
  filterEarningsByRange,
  getDailyAggregates,
  fillHourlyTotals,
  fillDailyTotals,
} from '../../mocks';

interface EarningsSummaryCardProps {
  totalEarnings: number;
  rangeLabel: string;
  selectedPreset: Preset;
  onPresetChange: (preset: Preset) => void;
  customStartDate: Date;
  customEndDate: Date;
  onCustomDateChange: (start: Date, end: Date) => void;
  onSeeFullReport: () => void;
  rangeStart: Date;
  rangeEnd: Date;
}

export function EarningsSummaryCard({
  totalEarnings,
  rangeLabel,
  selectedPreset,
  onPresetChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  onSeeFullReport,
  rangeStart,
  rangeEnd,
}: EarningsSummaryCardProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { earnings } = useEarnings();

  const isSingleDay = rangeStart.toDateString() === rangeEnd.toDateString();

  const { jobCount, dailyTotals, isHourly } = useMemo(() => {
    const entries = filterEarningsByRange(earnings, rangeStart, rangeEnd);
    if (isSingleDay) {
      return { jobCount: entries.length, dailyTotals: fillHourlyTotals(entries), isHourly: true };
    }
    return {
      jobCount: entries.length,
      dailyTotals: fillDailyTotals(getDailyAggregates(entries), rangeStart, rangeEnd),
      isHourly: false,
    };
  }, [earnings, rangeStart, rangeEnd, isSingleDay]);

  const avgPerJob = jobCount > 0 ? Math.round(totalEarnings / jobCount) : 0;
  const chartWidth = screenWidth - 64;

  return (
    <Card>
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-row items-center gap-2.5">
          <View
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${colors.primary['600']}15` }}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary['600']} />
          </View>
          <View>
            <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
              Earnings
            </Text>
            <Text className="text-[10px]" style={{ color: colors.ui.textMuted }}>
              {rangeLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onSeeFullReport}
          android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: `${colors.primary['600']}0D`,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          })}>
          <Text className="text-[11px] font-semibold" style={{ color: colors.primary['600'] }}>
            Full Report
          </Text>
          <Ionicons name="arrow-forward" size={12} color={colors.primary['600']} />
        </Pressable>
      </View>

      <Text className="font-heading mb-1 text-3xl tracking-tight" style={{ color: colors.ui.text }}>
        {formatCurrency(totalEarnings)}
      </Text>

      <View className="mb-4 flex-row items-center gap-3">
        <View className="flex-row items-center gap-1">
          <Ionicons name="briefcase-outline" size={11} color={colors.ui.textMuted} />
          <Text className="text-[11px]" style={{ color: colors.ui.textMuted }}>
            {jobCount} jobs
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="calculator-outline" size={11} color={colors.ui.textMuted} />
          <Text className="text-[11px]" style={{ color: colors.ui.textMuted }}>
            Avg {formatCurrency(avgPerJob)}/job
          </Text>
        </View>
      </View>

      <View className="mb-4">
        <EarningsDateRangeFilter
          selectedPreset={selectedPreset}
          onPresetChange={onPresetChange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          rangeLabel={selectedPreset !== 'Custom' ? rangeLabel : undefined}
          onCustomDateChange={onCustomDateChange}
        />
      </View>

      <EarningsTrendChart
        dailyTotals={dailyTotals}
        rangeLabel={rangeLabel}
        chartWidth={chartWidth}
        isHourly={isHourly}
        noCard
      />
    </Card>
  );
}
