import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface TabsProps<T extends string> {
  tabs: readonly T[] | T[];
  activeTab: T;
  onChangeTab: (tab: T) => void;
  containerStyle?: any;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChangeTab,
  containerStyle,
}: TabsProps<T>) {
  const { colors } = useTheme();
  const primaryColor = colors.primary['600'];

  return (
    <View className="flex-row rounded-2xl bg-gray-100 p-1" style={containerStyle}>
      {tabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <Pressable
            key={tab}
            onPress={() => onChangeTab(tab)}
            className="flex-1 items-center rounded-xl py-2"
            style={({ pressed }) => [
              { opacity: pressed && !isActive ? 0.7 : 1 },
              isActive
                ? {
                    backgroundColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 3,
                    elevation: 2,
                  }
                : {},
            ]}>
            <Text
              className="text-[13px] font-semibold"
              style={{ color: isActive ? primaryColor : '#9CA3AF' }}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
