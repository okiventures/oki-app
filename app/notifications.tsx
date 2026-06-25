import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { NotificationCenter } from '../src/components/features/NotificationCenter';
import { Notification } from '../src/types';

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    userId: 'c1',
    title: 'Booking Confirmed',
    body: 'Ceferino Jumao-as V has accepted your Plumbing request.',
    type: 'booking',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'n2',
    userId: 'c1',
    title: 'Handyman Arrived',
    body: 'Your service provider Ceferino Jumao-as V has arrived at your address.',
    type: 'booking',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'n3',
    userId: 'c1',
    title: 'Payment Successful',
    body: 'Your payment of ₱299.00 for Massage service was processed successfully.',
    type: 'payment',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n4',
    userId: 'c1',
    title: 'Welcome to Oki!',
    body: 'Thank you for choosing Oki. Start booking verified providers nearby.',
    type: 'system',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function NotificationsPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);

  const handleMarkRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Notifications" showBack={true} onBackPress={() => router.back()} />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <View className="mt-5 flex-1">
          <NotificationCenter
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
