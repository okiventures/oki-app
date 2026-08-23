import React, { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBookings } from '../../src/context/BookingsContext';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { ActiveBookingCard } from '../../src/components/cards/ActiveBookingCard';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { BookingStatus } from '../../src/types';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BookingListSection } from '../../src/components/bookings/BookingListSection';
import { isMockEnv } from '../../src/services/bookingService';
import { MOCK_CLIENT } from '../../src/mocks';

export default function ClientBookings() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bookings } = useBookings();
  const { session } = useAuth();
  const [searchText, setSearchText] = useState('');

  const clientId = session?.user?.id ?? (isMockEnv() ? MOCK_CLIENT.id : '');

  // RLS scopes this in live mode, but the mock set carries several clients'
  // bookings — without this the demo client sees other people's jobs, and the
  // list disagrees with the dashboard, which has always filtered by clientId.
  const myBookings = useMemo(
    () => bookings.filter((b) => b.clientId === clientId),
    [bookings, clientId]
  );

  // Filter bookings by search text
  const filteredBookings = myBookings.filter((b) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      b.description?.toLowerCase().includes(s) ||
      b.handymanName?.toLowerCase().includes(s) ||
      b.clientName?.toLowerCase().includes(s) ||
      String(b.serviceCategory).toLowerCase().includes(s)
    );
  });

  // Segment bookings
  const activeBookings = filteredBookings.filter(
    (b) =>
      b.status === BookingStatus.InTransit ||
      b.status === BookingStatus.Arrived ||
      b.status === BookingStatus.WorkStarted
  );

  const upcomingBookings = filteredBookings.filter(
    (b) => b.status === BookingStatus.Pending || b.status === BookingStatus.Accepted
  );

  const historyBookings = filteredBookings.filter(
    (b) => b.status === BookingStatus.Completed || b.status === BookingStatus.Paid
  );

  // Rejected has to be here too. A handyman declining puts the booking in
  // REJECTED, and it was in no bucket at all — so the client's own declined
  // requests rendered nowhere, while the handyman saw them in Past Jobs.
  const closedBookings = filteredBookings.filter(
    (b) => b.status === BookingStatus.Cancelled || b.status === BookingStatus.Rejected
  );

  const hasAnyBookings = filteredBookings.length > 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader
        title="My Bookings"
        showNotifications
        onNotificationsPress={() => router.push('/notifications')}
      />

      <View
        className="flex-1 overflow-hidden rounded-t-4xl"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="mt-5 flex-1 rounded-xl"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          <View className="px-5 py-4">
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search bookings, services or provider…"
            />
          </View>

          {hasAnyBookings ? (
            <View>
              {activeBookings.length > 0 && (
                <BookingListSection title="Active Bookings" noHorizontalPadding>
                  {activeBookings.map((item) => (
                    <ActiveBookingCard
                      key={item.id}
                      booking={item}
                      onViewDetailsPress={() => router.push(`/booking/${item.id}`)}
                    />
                  ))}
                </BookingListSection>
              )}

              {upcomingBookings.length > 0 && (
                <BookingListSection title="Upcoming Bookings">
                  {upcomingBookings.map((item) => (
                    <BookingCard
                      key={item.id}
                      booking={item}
                      userType="client"
                      onPress={() => router.push(`/booking/${item.id}`)}
                    />
                  ))}
                </BookingListSection>
              )}

              {historyBookings.length > 0 && (
                <BookingListSection title="Previous Activity">
                  {historyBookings.map((item) => (
                    <BookingCard
                      key={item.id}
                      booking={item}
                      userType="client"
                      onPress={() => router.push(`/booking/${item.id}`)}
                      onRebook={() => router.push('/new-booking')}
                      onReport={() => router.push(`/report/${item.id}`)}
                      onReview={() => router.push(`/review/${item.id}`)}
                    />
                  ))}
                </BookingListSection>
              )}

              {closedBookings.length > 0 && (
                <BookingListSection title="Cancelled & Declined">
                  {closedBookings.map((item) => (
                    <BookingCard
                      key={item.id}
                      booking={item}
                      userType="client"
                      onPress={() => router.push(`/booking/${item.id}`)}
                      onRebook={() => router.push('/new-booking')}
                    />
                  ))}
                </BookingListSection>
              )}
            </View>
          ) : (
            <EmptyState
              icon="clipboard-outline"
              title={searchText ? 'No matches found' : 'No bookings yet'}
              message={
                searchText
                  ? 'Try refining your search keyword or service category.'
                  : 'Your active and past appointments will show up here.'
              }
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
