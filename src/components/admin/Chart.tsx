import React from 'react';
import { View, Text } from 'react-native';

interface ChartProps {
  title: string;
  data: number[];
  labels: string[];
  type?: 'bar' | 'line';
  height?: number;
}

export function Chart({ title, data, labels, type = 'bar', height = 200 }: ChartProps) {
  const max = Math.max(...data, 1);

  return (
    <View className="rounded-xl border border-gray-100 bg-white p-3">
      <Text className="mb-3 text-sm font-semibold text-gray-900">{title}</Text>

      <View style={{ height }} className="flex-row items-end justify-between pt-2">
        {data.map((val, index) => {
          const percentage = (val / max) * 100;
          return (
            <View key={index} className="flex-1 items-center">
              {/* Render Bar */}
              <View
                style={{ height: `${percentage}%` }}
                className="bg-primary-500 min-h-[4px] w-3/5 rounded-t"
              />
              {/* Render Label */}
              <Text className="mt-2 text-[10px] text-gray-400" numberOfLines={1}>
                {labels[index]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
