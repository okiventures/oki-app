import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: number;
  flex?: number;
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
    <View className="overflow-hidden rounded-xl border border-gray-100 bg-white">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header Row */}
          <View className="flex-row border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <View
                key={col.key}
                style={{ width: col.width ?? 120, flex: col.flex }}
                className="justify-center px-3 py-2.5">
                <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-gray-400">
                  {col.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {data.map((row, i) => (
            <TouchableOpacity
              key={keyExtractor(row)}
              accessibilityLabel="Table row"
              activeOpacity={onRowPress ? 0.7 : 1}
              onPress={() => onRowPress?.(row)}
              className={`flex-row border-b ${
                i === data.length - 1 ? 'border-b-0' : 'border-gray-100'
              } ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={{ width: col.width ?? 120, flex: col.flex }}
                  className="justify-center px-3 py-3">
                  {col.render ? (
                    col.render(row)
                  ) : (
                    <Text className="text-[13px] text-gray-800" numberOfLines={1}>
                      {String((row as Record<string, unknown>)[col.key] ?? '')}
                    </Text>
                  )}
                </View>
              ))}
            </TouchableOpacity>
          ))}

          {data.length === 0 && (
            <View className="items-center px-4 py-8">
              <Text className="text-[13px] text-gray-400">No data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
