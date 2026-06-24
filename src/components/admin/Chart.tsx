import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface ChartProps {
  title: string;
  data: number[];
  labels: string[];
  type?: 'bar' | 'line';
  height?: number;
  unit?: 'currency' | 'count';
  legendLabel?: string;
}

export function Chart({
  title,
  data,
  labels,
  height = 180,
  unit = 'currency',
  legendLabel,
}: ChartProps) {
  const { colors } = useTheme();
  const max = Math.max(...data, 1);
  const ySteps = [max, Math.round(max / 2), 0];

  return (
    <View className="rounded-xl border border-gray-100 bg-white p-4">
      <Text className="mb-1 text-[14px] font-semibold text-gray-900">{title}</Text>

      {legendLabel ? (
        <View className="mb-3 flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors.primary['500'] }} />
          <Text className="text-[11px] text-gray-500">{legendLabel}</Text>
        </View>
      ) : null}

      <View className="flex-row" style={{ height }}>
        {/* Y-axis labels */}
        <View className="mr-2 items-end justify-between" style={{ paddingBottom: 20 }}>
          {ySteps.map((step) => (
            <Text key={step} className="text-[9px] text-gray-400" numberOfLines={1}>
              {unit === 'currency' ? `₱${(step / 1000).toFixed(0)}k` : step}
            </Text>
          ))}
        </View>

        {/* Bars */}
        <View className="flex-1 flex-row items-end justify-between" style={{ paddingBottom: 20 }}>
          {data.map((val, index) => {
            const barHeightPct = (val / max) * 100;
            return (
              <View key={index} className="flex-1 items-center">
                {/* Value tooltip above bar */}
                <Text className="mb-1 text-[8px] font-semibold text-gray-500" numberOfLines={1}>
                  {unit === 'currency' ? `₱${(val / 1000).toFixed(1)}k` : val}
                </Text>
                <View
                  style={{
                    height: `${Math.max(barHeightPct, 3)}%`,
                    width: '60%',
                    backgroundColor: colors.primary['500'],
                    borderRadius: 3,
                  }}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View className="flex-row" style={{ paddingLeft: 36 }}>
        {labels.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text className="text-[10px] text-gray-400" numberOfLines={1}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
