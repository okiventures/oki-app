import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '../../src/components/navigation/BottomNav';

export default function HandymanLayout() {
  const items = [
    {
      key: 'index',
      label: 'Dashboard',
      icon: 'grid-outline',
      route: '/(handyman)',
    },
    {
      key: 'requests',
      label: 'Requests',
      icon: 'notifications-outline',
      route: '/(handyman)/requests',
    },
    {
      key: 'schedule',
      label: 'Schedule',
      icon: 'calendar-outline',
      route: '/(handyman)/schedule',
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      route: '/(handyman)/profile',
    },
  ];

  return (
    <Tabs tabBar={() => <BottomNav items={items} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="requests" />
      <Tabs.Screen name="schedule" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
