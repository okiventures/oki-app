import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';

interface ChartSeries {
  name: string;
  data: number[];
  color: string;
}

interface ChartProps {
  title: string;
  labels: string[];
  type?: 'bar' | 'line';
  height?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  series?: ChartSeries[];
  data?: number[];
}

export function Chart({
  title,
  labels,
  type = 'bar',
  height = 220,
  yAxisLabel = 'Value',
  xAxisLabel = 'Period',
  series,
  data,
}: ChartProps) {
  const chartSeries = useMemo(
    () =>
      series && series.length > 0
        ? series
        : [{ name: 'Value', data: data ?? [], color: '#4F46E5' }],
    [series, data]
  );

  const maxValue = Math.max(...chartSeries.flatMap((item) => item.data), 1);
  const axisSteps = [maxValue, Math.round(maxValue / 2), 0];
  const [activeLabel, setActiveLabel] = useState<number | null>(null);

  return (
    <View className="rounded-xl border border-gray-100 bg-white p-3">
      <Text className="mb-2 text-sm font-semibold text-gray-900">{title}</Text>
      <View className="mb-3 flex-row flex-wrap gap-3">
        {chartSeries.map((serie) => (
          <View key={serie.name} className="flex-row items-center gap-2">
            <View style={{ backgroundColor: serie.color }} className="h-2 w-2 rounded-full" />
            <Text className="text-[11px] text-gray-500">{serie.name}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row gap-3">
        <View className="justify-between" style={{ height }}>
          {axisSteps.map((value) => (
            <Text key={`tick-${value}`} className="text-[10px] text-gray-400">
              {value}
            </Text>
          ))}
        </View>

        <View className="h-full flex-1 flex-row items-end justify-between">
          {labels.map((label, labelIndex) => (
            <View key={label} className="flex-1 items-center">
              <View className="h-full w-full flex-row items-end justify-center gap-1">
                {chartSeries.map((serie) => {
                  const value = serie.data[labelIndex] ?? 0;
                  const barHeight = Math.max((value / maxValue) * 100, 10);

                  return (
                    <Pressable
                      key={serie.name}
                      onPress={() => setActiveLabel(labelIndex)}
                      className="rounded-t-full"
                      style={{
                        width: 12,
                        height: `${barHeight}%`,
                        backgroundColor: serie.color,
                      }}
                    />
                  );
                })}
              </View>
              <Text className="mt-2 text-[10px] text-gray-400" numberOfLines={1}>
                {label}
              </Text>
              {activeLabel === labelIndex && (
                <View className="mt-2 w-full rounded-2xl bg-gray-100 px-2 py-1">
                  {chartSeries.map((serie) => (
                    <Text key={serie.name} className="text-[10px] text-gray-700">
                      {serie.name}: {serie.data[labelIndex] ?? 0}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      <View className="mt-3 flex-row justify-between">
        <Text className="text-[11px] text-gray-400">{yAxisLabel}</Text>
        <Text className="text-[11px] text-gray-400">{xAxisLabel}</Text>
      </View>
    </View>
  );
}
