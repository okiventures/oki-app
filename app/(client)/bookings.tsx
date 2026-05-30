import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { ActiveBookingCard } from '../../src/components/cards/ActiveBookingCard';
import { MOCK_BOOKINGS } from '../../src/mocks';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { BookingStatus } from '../../src/types';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BookingListSection } from '../../src/components/bookings/BookingListSection';

export default function ClientBookings() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');

  // Filter bookings by search text
  const filteredBookings = MOCK_BOOKINGS.filter((b) => {
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
    (b) =>
      b.status === BookingStatus.Completed ||
      b.status === BookingStatus.Paid ||
      b.status === BookingStatus.Cancelled
  );

  const hasAnyBookings = filteredBookings.length > 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="My Bookings" showNotifications onNotificationsPress={() => {}} />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
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
                      onTrackPress={() => {}}
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
                      onRebook={() => {}}
                      onReport={() => {}}
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
