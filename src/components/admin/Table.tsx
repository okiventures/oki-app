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
    <View className="bg-white rounded-lg overflow-hidden border border-gray-100">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header Row */}
          <View className="flex-row bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <View key={col.key} style={{ width: col.width || 120 }} className="p-2 justify-center">
                <Text className="text-[11px] font-bold text-gray-500 uppercase">
                  {col.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {data.map((row, i) => (
            <TouchableOpacity
              key={keyExtractor(row)}
              activeOpacity={onRowPress ? 0.7 : 1}
              onPress={() => onRowPress?.(row)}
              className={`flex-row border-b ${i === data.length - 1 ? 'border-b-0' : 'border-gray-100'} bg-white`}
            >
              {columns.map((col) => (
                <View key={col.key} style={{ width: col.width || 120 }} className="p-2 justify-center">
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
          ))}
          
          {/* Empty State */}
          {data.length === 0 && (
            <View className="p-4 items-center">
              <Text className="text-[13px] text-gray-400">No data available</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
