import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '../../src/components/navigation/BottomNav';

export default function AdminLayout() {
  const items = [
    { key: 'index', label: 'Dashboard', icon: 'pie-chart-outline', activeIcon: 'pie-chart', route: '/(admin)' },
    { key: 'users', label: 'Users', icon: 'people-outline', activeIcon: 'people', route: '/(admin)/users' },
    { key: 'disputes', label: 'Disputes', icon: 'warning-outline', activeIcon: 'warning', route: '/(admin)/disputes' },
  ];

  return (
    <Tabs tabBar={() => <BottomNav items={items} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="users" />
      <Tabs.Screen name="disputes" />
    </Tabs>
  );
}
