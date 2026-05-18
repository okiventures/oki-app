import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

interface BottomNavItem {
  key: string;
  label: string;
  icon: string;
  activeIcon: string;
  route: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View className="flex-row bg-white border-t border-gray-100 pb-1 shadow-sm elevation-10">
      {items.map((item) => {
        const isActive = pathname.includes(item.key);
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => router.push(item.route as never)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center pt-2.5 pb-1"
          >
            <Ionicons 
              name={(isActive ? item.activeIcon : item.icon) as never} 
              size={22} 
              color={isActive ? colors.primary['600'] : '#9CA3AF'} 
            />
            <Text className={`text-[11px] mt-1 ${isActive ? 'font-semibold text-primary-600' : 'font-normal text-gray-400'}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
