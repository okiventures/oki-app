import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNav } from '../../src/components/navigation/BottomNav';
import { useProtectedRoute } from '../../src/hooks/useProtectedRoute';

export default function ClientLayout() {
  useProtectedRoute('client');

  // Messaging is Week 19. Its tab is parked rather than deleted — the screen is
  // a permanent empty state, and giving it a quarter of the primary nav made a
  // feature that does not exist look like an inbox with nothing in it.
  const items = [
    { key: 'index', label: 'Home', icon: 'home-outline', route: '/(client)' },
    {
      key: 'bookings',
      label: 'Bookings',
      icon: 'calendar-outline',
      route: '/(client)/bookings',
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: 'person-outline',
      route: '/(client)/profile',
    },
  ];

  return (
    <Tabs tabBar={() => <BottomNav items={items} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
