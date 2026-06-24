import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBookings } from '../../src/context/BookingsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { ActiveBookingCard } from '../../src/components/cards/ActiveBookingCard';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { BookingStatus } from '../../src/types';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { BookingListSection } from '../../src/components/bookings/BookingListSection';

function BookingSkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className="mx-5 mb-3 rounded-2xl border border-gray-100 bg-white p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 rounded-full bg-gray-200" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-28 rounded bg-gray-200" />
          <View className="h-2.5 w-20 rounded bg-gray-100" />
        </View>
        <View className="h-6 w-16 rounded-full bg-gray-200" />
      </View>
      <View className="mt-3 h-2.5 w-40 rounded bg-gray-100" />
      <View className="mt-2 h-2.5 w-32 rounded bg-gray-100" />
    </Animated.View>
  );
}

export default function ClientBookings() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bookings } = useBookings();
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return (
      b.description?.toLowerCase().includes(s) ||
      b.handymanName?.toLowerCase().includes(s) ||
      b.clientName?.toLowerCase().includes(s) ||
      String(b.serviceCategory).toLowerCase().includes(s)
    );
  });

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
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader
        title="My Bookings"
        showNotifications
        onNotificationsPress={() => router.push('/notifications')}
      />

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
              accessibilityLabel="Search bookings"
            />
          </View>

          {isLoading ? (
            <View className="mt-1">
              <BookingSkeletonCard />
              <BookingSkeletonCard />
              <BookingSkeletonCard />
            </View>
          ) : hasAnyBookings ? (
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
