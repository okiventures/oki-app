import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { useBookings } from '../../src/context/BookingsContext';
import { ScheduleCalendar } from '../../src/components/handyman/ScheduleCalendar';
import { EmptyState } from '../../src/components/ui/EmptyState';

const HANDYMAN_ID = 'h1';

export default function HandymanSchedule() {
  const { colors } = useTheme();
  const { bookings } = useBookings();
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const myBookings = bookings.filter((booking) => booking.handymanId === HANDYMAN_ID);

  const scheduledBookings = myBookings.filter((booking) => booking.scheduledAt);

  const selectedDayBookings = scheduledBookings.filter((booking) => {
    const bookingDate = new Date(booking.scheduledAt as string);
    return (
      bookingDate.getFullYear() === selectedDate.getFullYear() &&
      bookingDate.getMonth() === selectedDate.getMonth() &&
      bookingDate.getDate() === selectedDate.getDate()
    );
  });

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="My Schedule" />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="mt-5 flex-1 rounded-xl"
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          <ScheduleCalendar
            bookings={scheduledBookings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            handymanId={HANDYMAN_ID}
          />

          <View className="mt-6 px-4">
            <View>
              {selectedDayBookings.length > 0 ? (
                selectedDayBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    userType="handyman"
                    onPress={() => {}}
                  />
                ))
              ) : (
                <EmptyState
                  icon="calendar-outline"
                  title="No jobs on this day"
                  message="Pick another date to see your assigned bookings and reserved slots."
                />
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
