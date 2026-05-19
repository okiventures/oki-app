import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface TabItem {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
  scrollable?: boolean;
}

export function TabBar({ tabs, activeKey, onTabPress, scrollable = false }: TabBarProps) {
  const content = tabs.map((tab) => {
    const isActive = tab.key === activeKey;
    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onTabPress(tab.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        className={`py-2.5 ${scrollable ? 'px-3 flex-none' : 'flex-1'} items-center border-b-2 ${isActive ? 'border-primary-600' : 'border-transparent'}`}
      >
        <Text className={`text-[13px] ${isActive ? 'font-bold text-primary-600' : 'font-medium text-gray-500'}`}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View className="border-b border-gray-100">
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {content}
        </ScrollView>
      ) : (
        <View className="flex-row">{content}</View>
      )}
    </View>
  );
}
