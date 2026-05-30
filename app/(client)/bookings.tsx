import React, { useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { ActiveBookingCard } from '../../src/components/cards/ActiveBookingCard';
import { MOCK_BOOKINGS } from '../../src/mocks';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { BookingStatus } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';

export default function ClientBookings() {
  const { colors } = useTheme();
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.ui.background }}>
      {/* Main scrolling content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.ui.background }}>
        {/* Search Bar Block */}
        <View className="px-5 py-4">
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search bookings, services or provider…"
          />
        </View>

        {/* Content list */}
        {hasAnyBookings ? (
          <View>
            {/* 1. Active Bookings Section */}
            {activeBookings.length > 0 && (
              <View className="mb-3.5">
                <Text
                  className="mx-5 mb-2.5 text-[15px] font-semibold"
                  style={{ color: colors.ui.text }}>
                  Active Bookings
                </Text>
                {activeBookings.map((item) => (
                  <ActiveBookingCard
                    key={item.id}
                    booking={item}
                    onTrackPress={() => {}}
                    onViewDetailsPress={() => {}}
                  />
                ))}
              </View>
            )}

            {/* 2. Upcoming Bookings Section */}
            {upcomingBookings.length > 0 && (
              <View className="mb-3.5 px-5">
                <Text
                  className="mb-2.5 text-[15px] font-semibold"
                  style={{ color: colors.ui.text }}>
                  Upcoming Bookings
                </Text>
                {upcomingBookings.map((item) => (
                  <BookingCard key={item.id} booking={item} userType="client" onPress={() => {}} />
                ))}
              </View>
            )}

            {/* 3. Previous Activity / History Section */}
            {historyBookings.length > 0 && (
              <View className="mb-3.5 px-5">
                <Text
                  className="mb-2.5 text-[15px] font-semibold"
                  style={{ color: colors.ui.text }}>
                  Previous Activity
                </Text>
                {historyBookings.map((item) => (
                  <BookingCard
                    key={item.id}
                    booking={item}
                    userType="client"
                    onPress={() => {}}
                    onRebook={() => {}}
                    onReport={() => {}}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Empty Search or Empty Data State */
          <View className="mt-16 items-center justify-center px-8">
            <View
              className="mb-4 h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${colors.primary['600']}15` }}>
              <Ionicons name="clipboard-outline" size={32} color={colors.primary['600']} />
            </View>
            <Text className="text-center text-base font-semibold" style={{ color: colors.ui.text }}>
              {searchText ? 'No matches found' : 'No bookings yet'}
            </Text>
            <Text className="mt-1.5 text-center text-sm" style={{ color: colors.ui.textLight }}>
              {searchText
                ? 'Try refining your search keyword or service category.'
                : 'Your active and past appointments will show up here.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
