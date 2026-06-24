import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: number;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowPress?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function Table<T>({ columns, data, onRowPress, keyExtractor }: TableProps<T>) {
  return (
    <View className="bg-white rounded-xl overflow-hidden border border-gray-100">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-[720px]">
          <View className="flex-row bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <View key={col.key} style={{ minWidth: col.width || 140, width: col.width || 140 }} className="p-3 justify-center">
                <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.08em]">
                  {col.title}
                </Text>
              </View>
            ))}
          </View>

          {data.length > 0 ? (
            data.map((row, index) => (
              <TouchableOpacity
                key={keyExtractor(row)}
                activeOpacity={onRowPress ? 0.7 : 1}
                onPress={() => onRowPress?.(row)}
                className={`flex-row border-b ${index === data.length - 1 ? 'border-b-0' : 'border-gray-100'} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                {columns.map((col) => (
                  <View key={col.key} style={{ minWidth: col.width || 140, width: col.width || 140 }} className="p-3 justify-center">
                    {col.render ? (
                      col.render(row)
                    ) : (
                      <Text className="text-[13px] text-gray-900" numberOfLines={1}>
                        {String((row as any)[col.key] ?? '')}
                      </Text>
                    )}
                  </View>
                ))}
              </TouchableOpacity>
            ))
          ) : (
            <View className="p-4 items-center">
              <Text className="text-[13px] text-gray-400">No records to display</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
