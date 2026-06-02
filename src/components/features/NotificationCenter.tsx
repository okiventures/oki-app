import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../../types';
import { formatDateTime } from '../../utils';
import { useTheme } from '../../context/ThemeContext';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationCenterProps) {
  const { colors } = useTheme();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-14">
        <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
        <Text className="mt-3 text-sm font-semibold text-gray-500">No notifications yet</Text>
        <Text className="mt-1 text-[11px] text-gray-400">
          We'll let you know when something happens
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {unreadCount > 0 && (
        <TouchableOpacity onPress={onMarkAllRead} className="self-end px-3 py-2">
          <Text className="text-[11px] font-semibold text-gray-500">Mark all as read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.ui.border }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onMarkRead(item.id)}
            className="flex-row items-start px-5 py-4 bg-transparent">
            <View
              className="h-2 w-2 rounded-full mt-1.5 mr-3"
              style={item.isRead ? {} : { backgroundColor: colors.primary['600'] }}
            />
            <View className="flex-1">
              <Text
                style={{ color: colors.ui.text }}
                className={`text-[13px] ${item.isRead ? 'font-normal' : 'font-semibold'} mb-0.5`}>
                {item.title}
              </Text>
              <Text style={{ color: colors.ui.textMuted }} className="text-[13px] leading-5">{item.body}</Text>
              <Text style={{ color: colors.ui.textLight }} className="mt-1 text-[11px]">
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
