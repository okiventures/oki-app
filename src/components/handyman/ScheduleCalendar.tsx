import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Booking, BookingStatus } from '../../types';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../constants/theme';
import { formatTime } from '../../utils';
import { Card } from '../ui/Card';

interface ScheduleCalendarProps {
  bookings: Booking[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const SLOT_HOURS = [8, 10, 12, 14, 16, 18];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getWeekDays(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  return Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86400000));
}

export function ScheduleCalendar({ bookings, selectedDate, onSelectDate }: ScheduleCalendarProps) {
  const selectedDayBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.scheduledAt)
        .filter((booking) => booking.status !== BookingStatus.Cancelled)
        .filter((booking) => isSameDay(new Date(booking.scheduledAt as string), selectedDate))
        .sort(
          (left, right) =>
            new Date(left.scheduledAt as string).getTime() -
            new Date(right.scheduledAt as string).getTime()
        ),
    [bookings, selectedDate]
  );

  const weekDays = useMemo(() => getWeekDays(new Date()), []);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {weekDays.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayBookings = bookings.filter(
            (booking) =>
              booking.scheduledAt &&
              booking.status !== BookingStatus.Cancelled &&
              isSameDay(new Date(booking.scheduledAt), date)
          );

          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => onSelectDate(date)}
              className={`w-[72px] rounded-2xl border px-3 py-3 ${isSelected ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white'}`}>
              <Text
                className={`text-center text-[11px] font-medium ${isSelected ? 'text-primary-700' : 'text-gray-500'}`}>
                {date.toLocaleDateString('en-PH', { weekday: 'short' })}
              </Text>
              <Text
                className={`mt-1 text-center text-[18px] font-bold ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                {date.getDate()}
              </Text>
              <Text
                className={`mt-1 text-center text-[11px] ${isSelected ? 'text-primary-700' : 'text-gray-500'}`}>
                {dayBookings.length} booked
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card className="mx-4 mt-4">
        <Text className="text-[14px] font-semibold text-gray-900">Booked time slots</Text>
        <View className="mt-4 gap-3">
          {SLOT_HOURS.map((hour) => {
            const slotBookings = selectedDayBookings.filter((booking) => {
              const bookingDate = new Date(booking.scheduledAt as string);
              return bookingDate.getHours() >= hour && bookingDate.getHours() < hour + 2;
            });

            const slotLabel = new Date(2026, 0, 1, hour).toLocaleTimeString('en-PH', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <View key={hour} className="flex-row items-start gap-3">
                <View className="w-20 pt-3">
                  <Text className="text-[12px] font-medium text-gray-500">{slotLabel}</Text>
                </View>
                <View className="flex-1 gap-2">
                  {slotBookings.length > 0 ? (
                    slotBookings.map((booking) => {
                      const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? '#6B7280';
                      return (
                        <View
                          key={booking.id}
                          className="rounded-2xl border border-gray-100 px-3 py-3"
                          style={{ backgroundColor: `${statusColor}10` }}>
                          <Text className="text-[13px] font-semibold text-gray-900">
                            {booking.serviceCategory} · {booking.clientName}
                          </Text>
                          <Text className="mt-1 text-[12px] text-gray-600">
                            {formatTime(booking.scheduledAt as string)} · {booking.location}
                          </Text>
                          <Text
                            className="mt-1 text-[11px] font-medium"
                            style={{ color: statusColor }}>
                            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <View className="rounded-2xl border border-dashed border-gray-200 px-3 py-3">
                      <Text className="text-[12px] text-gray-400">
                        No booking reserved for this slot.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}
