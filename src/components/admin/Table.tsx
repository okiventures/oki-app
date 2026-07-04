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
  const minWidth = columns.reduce((sum, col) => sum + (col.width || 140), 0);

  return (
    <View
      className="overflow-hidden rounded-xl border border-gray-100 bg-white"
      style={{ width: '100%' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth }}>
          <View className="flex-row border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <View
                key={col.key}
                style={{ width: col.width || 140 }}
                className="justify-center p-3">
                <Text className="text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
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
                className={`flex-row border-b ${index === data.length - 1 ? 'border-b-0' : 'border-gray-100'} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={{ width: col.width || 140 }}
                    className="justify-center p-3">
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
            <View className="items-center p-4">
              <Text className="text-[13px] text-gray-400">No records to display</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
