import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '../../src/components/navigation/BottomNav';

export default function ClientLayout() {
  const items = [
    { key: 'index', label: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/(client)' },
    { key: 'bookings', label: 'Bookings', icon: 'calendar-outline', activeIcon: 'calendar', route: '/(client)/bookings' },
    { key: 'messages', label: 'Messages', icon: 'chatbubble-outline', activeIcon: 'chatbubble', route: '/(client)/messages' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', route: '/(client)/profile' },
  ];

  return (
    <Tabs tabBar={() => <BottomNav items={items} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

