import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface ScreenHeaderProps {
  title: string;
  onSettingsPress?: () => void;
  onNotificationsPress?: () => void;
  showSettings?: boolean;
  showNotifications?: boolean;
}

export function ScreenHeader({
  title,
  onSettingsPress,
  onNotificationsPress,
  showSettings = false,
  showNotifications = false,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View className="px-5 pt-4 pb-20" style={{ backgroundColor: colors.primary['600'] }}>
      <View className="flex-row items-center justify-between">
        {showSettings ? (
          <Pressable
            onPress={onSettingsPress}
            accessibilityLabel="Settings"
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-1">
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
        ) : (
          <View className="w-[30px] p-1" />
        )}

        <Text className="flex-1 text-center text-[17px] font-semibold text-white">{title}</Text>

        {showNotifications ? (
          <Pressable
            onPress={onNotificationsPress}
            accessibilityLabel="Notifications"
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-1">
            <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
        ) : (
          <View className="w-[30px] p-1" />
        )}
      </View>
    </View>
  );
}
