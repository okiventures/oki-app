import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '../../src/components/navigation/BottomNav';
import { useProtectedRoute } from '../../src/hooks/useProtectedRoute';

export default function AdminLayout() {
  useProtectedRoute('admin');

  const items = [
    {
      key: 'index',
      label: 'Dashboard',
      icon: 'pie-chart-outline',
      activeIcon: 'pie-chart',
      route: '/(admin)',
    },
    {
      key: 'users',
      label: 'Users',
      icon: 'people-outline',
      activeIcon: 'people',
      route: '/(admin)/users',
    },
    {
      key: 'bookings',
      label: 'Bookings',
      icon: 'calendar-outline',
      activeIcon: 'calendar',
      route: '/(admin)/bookings',
    },
    {
      key: 'transactions',
      label: 'Payments',
      icon: 'card-outline',
      activeIcon: 'card',
      route: '/(admin)/transactions',
    },
    {
      key: 'disputes',
      label: 'Disputes',
      icon: 'warning-outline',
      activeIcon: 'warning',
      route: '/(admin)/disputes',
    },
  ];

  return (
    <Tabs tabBar={() => <BottomNav items={items} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="users" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="disputes" />
    </Tabs>
  );
}
