import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { BookingCard } from '../../src/components/cards/BookingCard';
import { useBookings } from '../../src/context/BookingsContext';
import { BookingStatus } from '../../src/types';
import { ScheduleCalendar } from '../../src/components/handyman/ScheduleCalendar';
import { EmptyState } from '../../src/components/ui/EmptyState';

const HANDYMAN_ID = 'h1';

export default function HandymanSchedule() {
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
    <View className="flex-1 bg-gray-50">
      <Navbar title="My Schedule" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <ScheduleCalendar
          bookings={scheduledBookings}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <View className="mt-6 px-4">
          <View>
            {selectedDayBookings.length > 0 ? (
              selectedDayBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} userType="handyman" onPress={() => {}} />
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
  );
}
