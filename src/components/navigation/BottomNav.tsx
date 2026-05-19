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

  const normalize = (path: string) => {
    let clean = path.replace(/\/\([^)]+\)/g, '');
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  };

  const normalizedPath = normalize(pathname);

  return (
    <View className="elevation-10 flex-row border-t border-gray-100 bg-white pb-1 shadow-sm">
      {items.map((item) => {
        const normalizedRoute = normalize(item.route);
        const isActive =
          item.key === 'index'
            ? normalizedPath === '/'
            : normalizedPath === normalizedRoute ||
              normalizedPath.startsWith(normalizedRoute + '/');
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => router.push(item.route as never)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center pt-2.5 pb-1">
            <Ionicons
              name={(isActive ? item.activeIcon : item.icon) as never}
              size={22}
              color={isActive ? colors.primary['600'] : '#9CA3AF'}
            />
            <Text
              style={{ color: isActive ? colors.primary['600'] : '#9CA3AF' }}
              className={`mt-1 text-[11px] ${isActive ? 'font-semibold' : 'font-normal'}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
