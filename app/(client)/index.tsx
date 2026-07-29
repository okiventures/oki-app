import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useBookings } from '../../src/context/BookingsContext';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { isMockEnv } from '../../src/services/bookingService';
import { BookingStatus } from '../../src/types';

import { DashboardHeader } from '../../src/components/home/DashboardHeader';
import { GreetingBlock } from '../../src/components/home/GreetingBlock';

import { ActiveBookingCard } from '../../src/components/cards/ActiveBookingCard';
import { CategoryGrid } from '../../src/components/home/CategoryGrid';
import { QuickBookCards } from '../../src/components/home/QuickBookCards';
import { PromoCard } from '../../src/components/home/PromoCard';
import { RecentActivity } from '../../src/components/home/RecentActivity';

import {
  MOCK_CLIENT,
  MOCK_DASHBOARD_CATEGORIES,
  MOCK_QUICK_BOOK_MODES,
  MOCK_PROMO,
  MOCK_RECENT_ACTIVITY_ROWS,
} from '../../src/mocks';

export default function ClientHome() {
  const { colors } = useTheme();
  const { bookings } = useBookings();
  const { session } = useAuth();
  const [searchText, setSearchText] = useState('');

  const { profile } = useProfile();

  const clientId = session?.user?.id ?? (isMockEnv() ? MOCK_CLIENT.id : '');

  // Header identity comes from the signed-in profile; the mock is the offline
  // demo fallback only. Rendering MOCK_CLIENT unconditionally meant the
  // dashboard greeted every account by the same hardcoded name.
  const displayName = profile?.user?.full_name ?? (isMockEnv() ? MOCK_CLIENT.name : '');
  const displayPhoto = profile?.user?.photo_url ?? (isMockEnv() ? MOCK_CLIENT.photoUrl : undefined);

  const filteredCategories = searchText
    ? MOCK_DASHBOARD_CATEGORIES.filter((c) =>
        c.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : MOCK_DASHBOARD_CATEGORIES;

  const myBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.clientId === clientId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [bookings, clientId]
  );

  const latestPending = myBookings.find((b) => b.status === BookingStatus.Pending);

  const latestActive = myBookings.find(
    (b) =>
      b.status !== BookingStatus.Pending &&
      b.status !== BookingStatus.Cancelled &&
      b.status !== BookingStatus.Rejected &&
      b.status !== BookingStatus.Completed &&
      b.status !== BookingStatus.Paid
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <DashboardHeader
        city={MOCK_CLIENT.location}
        userName={displayName}
        userPhotoUrl={displayPhoto}
        unreadCount={3}
        onNotificationPress={() => router.push('/notifications')}
        onProfilePress={() => router.push('/profile')}
      />

      <View
        className="flex-1 overflow-hidden rounded-t-4xl"
        style={{ backgroundColor: colors.ui.background, marginTop: -24 }}>
        <ScrollView
          className="mt-5 flex-1 rounded-xl"
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          <GreetingBlock
            userName={displayName}
            searchValue={searchText}
            onSearchChange={setSearchText}
          />

          <QuickBookCards modes={MOCK_QUICK_BOOK_MODES} />

          <PromoCard promo={MOCK_PROMO} />

          <CategoryGrid categories={filteredCategories} />

          {latestPending ? (
            <View
              className="mx-5 mb-5 overflow-hidden rounded-2xl border border-amber-200"
              style={{
                backgroundColor: colors.ui.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}>
              <View
                className="flex-row items-center gap-2 px-4 pt-3.5 pb-2.5"
                style={{ backgroundColor: '#FFF7ED' }}>
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#F59E0B' }}>
                  <Ionicons name="time-outline" size={15} color="#FFF" />
                </View>
                <Text className="text-[14px] font-semibold text-amber-800">
                  Waiting for a handyman
                </Text>
              </View>
              <View className="px-4 pt-2 pb-4">
                <Text className="text-[15px] font-medium" style={{ color: colors.ui.text }}>
                  {latestPending.serviceCategory}
                </Text>
                <Text className="mt-0.5 text-xs" style={{ color: colors.ui.textLight }}>
                  {latestPending.description || latestPending.location}
                </Text>
                <Text className="mt-1.5 text-xs text-amber-600">
                  We&apos;re finding the best available professional for you. You&apos;ll be
                  notified once someone accepts.
                </Text>
              </View>
            </View>
          ) : latestActive ? (
            <ActiveBookingCard
              booking={latestActive}
              onTrackPress={() => {}}
              onViewDetailsPress={() => router.push(`/booking/${latestActive.id}`)}
            />
          ) : null}

          <RecentActivity
            rows={MOCK_RECENT_ACTIVITY_ROWS.slice(0, 2)}
            onViewHistory={() => router.push('/bookings')}
            onReport={(id) => router.push(`/report/${id}`)}
            onReview={(id) => router.push(`/review/${id}`)}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
