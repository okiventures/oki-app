import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_BG } from '../../constants/categories';

interface CategoryItem {
  category: string;
  amount: number;
  count: number;
}

interface EarningsCategoryBreakdownProps {
  items: CategoryItem[];
  chartWidth: number;
}

export function EarningsCategoryBreakdown({ items, chartWidth }: EarningsCategoryBreakdownProps) {
  const { colors } = useTheme();

  if (!items.length) {
    return (
      <Card>
        <Text className="font-heading mb-3 text-[15px]" style={{ color: colors.ui.text }}>
          By Category
        </Text>
        <View className="h-16 items-center justify-center">
          <Text className="text-[13px]" style={{ color: colors.ui.textMuted }}>
            No data for this period
          </Text>
        </View>
      </Card>
    );
  }

  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  const maxAmount = sorted[0].amount;
  const total = sorted.reduce((s, i) => s + i.amount, 0);
  const barMaxWidth = chartWidth - 112;

  const meta = (cat: string) => ({
    icon: CATEGORY_ICONS[cat] ?? '\u{1F6E0}',
    color: CATEGORY_COLORS[cat] ?? '#6B7280',
    bg: CATEGORY_BG[cat] ?? '#F3F4F6',
  });

  return (
    <Card>
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
          By Category
        </Text>
        <Text className="text-[11px] font-medium" style={{ color: colors.ui.textMuted }}>
          {sorted.length} categories
        </Text>
      </View>

      <View className="gap-4">
        {sorted.map((item) => {
          const { icon, color, bg } = meta(item.category);
          const barWidth = Math.max(4, (item.amount / maxAmount) * barMaxWidth);
          const pct = Math.round((item.amount / total) * 100);

          return (
            <View key={item.category}>
              <View className="mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: bg }}>
                    <Text style={{ fontSize: 13 }}>{icon}</Text>
                  </View>
                  <Text className="text-[13px] font-medium" style={{ color: colors.ui.text }}>
                    {item.category}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[13px] font-bold" style={{ color: colors.ui.text }}>
                    {formatCurrency(item.amount)}
                  </Text>
                  <Text className="text-[10px]" style={{ color: colors.ui.textMuted }}>
                    {pct}% · {item.count} jobs
                  </Text>
                </View>
              </View>

              <View className="h-2.5 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                <View
                  className="h-2.5 rounded-full"
                  style={{ width: barWidth, backgroundColor: color }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
