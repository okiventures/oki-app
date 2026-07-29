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

import { useServiceCategories } from '../../src/hooks/useServiceCategories';
import type { RecentActivityRow } from '../../src/mocks/dashboard';
import { formatDate } from '../../src/utils';

// MOCK_QUICK_BOOK_MODES and MOCK_PROMO are static marketing copy with no table
// behind them yet, so they stay as app content rather than mock user data.
import { MOCK_CLIENT, MOCK_QUICK_BOOK_MODES, MOCK_PROMO } from '../../src/mocks';

const ACTIVITY_STATUS: Partial<Record<BookingStatus, RecentActivityRow['status']>> = {
  [BookingStatus.Completed]: 'Completed',
  [BookingStatus.Paid]: 'Completed',
  [BookingStatus.Cancelled]: 'Cancelled',
  [BookingStatus.Rejected]: 'Cancelled',
};

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

  const { categories } = useServiceCategories();

  const filteredCategories = useMemo(
    () =>
      searchText
        ? categories.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()))
        : categories,
    [categories, searchText]
  );

  const myBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.clientId === clientId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [bookings, clientId]
  );

  // No city is stored on the user record, so the header shows the city from the
  // client's most recent booking address rather than a hardcoded one.
  const city = useMemo(() => {
    if (isMockEnv()) return MOCK_CLIENT.location;
    const address = myBookings[0]?.location;
    if (!address) return '';
    const parts = address.split(',').map((part) => part.trim());
    return parts[parts.length - 1] || address;
  }, [myBookings]);

  const recentActivity = useMemo<RecentActivityRow[]>(
    () =>
      myBookings.slice(0, 2).map((booking) => ({
        id: booking.id,
        categoryId: booking.serviceCategory.toLowerCase(),
        serviceName: booking.description || booking.serviceCategory,
        dateLabel: formatDate(booking.updatedAt),
        workerName: booking.handymanName,
        price: booking.amount,
        status: ACTIVITY_STATUS[booking.status] ?? 'In Progress',
        rating: booking.ratingGiven,
      })),
    [myBookings]
  );

  // The badge was hardcoded to 3. There is no notifications table yet, so live
  // mode shows nothing rather than inventing unread items.
  const unreadCount = isMockEnv() ? 3 : 0;

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
        city={city}
        userName={displayName}
        userPhotoUrl={displayPhoto}
        unreadCount={unreadCount}
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
            rows={recentActivity}
            onViewHistory={() => router.push('/bookings')}
            onReport={(id) => router.push(`/report/${id}`)}
            onReview={(id) => router.push(`/review/${id}`)}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
