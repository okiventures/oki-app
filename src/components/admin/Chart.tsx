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
    <View className="bg-white rounded-xl p-3 border border-gray-100">
      <Text className="text-sm font-semibold text-gray-900 mb-3">
        {title}
      </Text>
      
      <View style={{ height }} className="flex-row items-end justify-between pt-2">
        {data.map((val, index) => {
          const percentage = (val / max) * 100;
          return (
            <View key={index} className="items-center flex-1">
              {/* Render Bar */}
              <View 
                style={{ height: `${percentage}%` }} 
                className="w-3/5 bg-primary-500 rounded-t min-h-[4px]" 
              />
              {/* Render Label */}
              <Text className="text-[10px] text-gray-400 mt-2" numberOfLines={1}>
                {labels[index]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
