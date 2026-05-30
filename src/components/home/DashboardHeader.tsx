import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';

interface DashboardHeaderProps {
  city: string;
  onCityPress?: () => void;
  onNotificationPress?: () => void;
  unreadCount?: number;
  userName: string;
  userPhotoUrl?: string;
}

export function DashboardHeader({
  city,
  onCityPress,
  onNotificationPress,
  unreadCount = 0,
  userName,
  userPhotoUrl,
}: DashboardHeaderProps) {
  const { colors } = useTheme();
  const firstName = userName.split(' ')[0];

  return (
    <View
      className="rounded-b-xl px-5 pt-12 pb-5"
      style={{
        backgroundColor: colors.primary['600'],
      }}>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={onCityPress}
          accessibilityLabel={`Change city, currently ${city}`}
          className="flex-1">
          <Text className="text-xs font-normal text-white/60">Current Location</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="location-sharp" size={20} color="rgba(255,255,255,0.85)" />
            <Text className="text-lg font-semibold text-white">{city}</Text>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>

        {/* ── right actions ── */}
        <View className="mt-5 flex flex-row items-center gap-3">
          <TouchableOpacity
            onPress={onNotificationPress}
            accessibilityLabel={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
            }
            className="relative p-1">
            <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.9)" />
            {unreadCount > 0 && (
              <View
                className="absolute top-0 right-0 h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: '#FFFFFF' }}>
                <Text className="text-[10px] font-bold" style={{ color: colors.primary['600'] }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={`Profile, ${firstName}`}
            className="flex-row items-center gap-1.5 rounded-full border px-2 py-1"
            style={{
              borderColor: 'rgba(255,255,255,0.35)',
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}>
            <Avatar name={userName} photoUrl={userPhotoUrl} size={24} />
            <Text className="text-[13px] font-medium text-white">{firstName}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
