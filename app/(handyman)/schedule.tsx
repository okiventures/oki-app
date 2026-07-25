import React, { useState, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { useBookings } from '../../src/context/BookingsContext';
import { ScheduleCalendar } from '../../src/components/handyman/ScheduleCalendar';
import { getFreshMockBookings } from '../../src/mocks/bookings';
import { Booking } from '../../src/types';
import {
  getAvailabilityForHandyman,
  setDayAvailability,
  removeDayAvailability,
} from '../../src/mocks/availability';

const HANDYMAN_ID = 'h1';
const TOTAL_HOURS = 19;
const MIN_HOUR = 5;

function jsDayToStoreDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function buildGrid(): boolean[][] {
  const grid = Array.from({ length: 7 }, () => Array(TOTAL_HOURS).fill(false));
  const blocks = getAvailabilityForHandyman(HANDYMAN_ID);
  for (const block of blocks) {
    if (block.recurrence !== 'weekly') continue;
    const storeDayMatch = block.id.match(/-d(\d)$/);
    if (!storeDayMatch) continue;
    const storeDay = parseInt(storeDayMatch[1], 10);
    const jsDay = (storeDay + 1) % 7;
    const startHour = block.startHour;
    const endHour = block.endHour;
    for (let h = startHour; h < endHour; h++) {
      const hourIdx = h - MIN_HOUR;
      if (hourIdx >= 0 && hourIdx < TOTAL_HOURS) {
        grid[jsDay][hourIdx] = true;
      }
    }
  }
  return grid;
}

function getSelectedDayIndex(selectedDate: Date): number {
  return selectedDate.getDay();
}

export default function HandymanSchedule() {
  const { colors } = useTheme();
  const router = useRouter();
  const { bookings: contextBookings } = useBookings();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [availRefreshKey, setAvailRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftGrid, setDraftGrid] = useState<boolean[][] | null>(null);

  const scheduledBookings = useMemo(() => {
    const fresh = getFreshMockBookings();
    const merged = new Map<string, Booking>();
    for (const b of fresh) merged.set(b.id, b);
    for (const b of contextBookings) merged.set(b.id, b);
    return [...merged.values()].filter((b) => b.handymanId === HANDYMAN_ID && b.scheduledAt);
  }, [contextBookings]);

  const selectedDayIndex = getSelectedDayIndex(selectedDate);

  function handleStartEditing() {
    setDraftGrid(buildGrid());
    setIsEditing(true);
  }

  function handleCancelEditing() {
    setDraftGrid(null);
    setIsEditing(false);
  }

  const handleCellToggle = useCallback((dayIndex: number, hourIndex: number) => {
    setDraftGrid((prev) => {
      if (!prev) return prev;
      const next = prev.map((day) => [...day]);
      next[dayIndex][hourIndex] = !next[dayIndex][hourIndex];
      return next;
    });
  }, []);

  function handleSave() {
    if (!draftGrid) return;
    for (let jsDay = 0; jsDay < 7; jsDay++) {
      const storeDay = jsDayToStoreDay(jsDay);
      const dayHours = draftGrid[jsDay];
      const enabled = dayHours.some(Boolean);
      if (enabled) {
        const startIdx = dayHours.findIndex(Boolean);
        const endIdx = dayHours.length - 1 - [...dayHours].reverse().findIndex(Boolean);
        setDayAvailability(HANDYMAN_ID, storeDay, startIdx + MIN_HOUR, endIdx + MIN_HOUR + 1);
      } else {
        removeDayAvailability(HANDYMAN_ID, storeDay);
      }
    }
    setIsEditing(false);
    setDraftGrid(null);
    setAvailRefreshKey((k) => k + 1);
  }

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
          <View className="mx-4 mb-3 flex-row items-center justify-between">
            <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
              {isEditing
                ? 'Tap hours on timeline to toggle availability'
                : selectedDate.toLocaleDateString('en-PH', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
            </Text>
            <View className="flex-row gap-2">
              {isEditing ? (
                <>
                  <Pressable
                    onPress={handleCancelEditing}
                    className="rounded-full border border-gray-300 px-3 py-1.5"
                    android_ripple={{ color: '#F3F4F6' }}>
                    <Text className="text-[12px] font-semibold text-gray-600">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: colors.primary['500'] }}
                    android_ripple={{ color: colors.primary['700'] }}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                    <Text className="text-[12px] font-semibold text-white">Save</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={handleStartEditing}
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: colors.primary['500'] }}
                  android_ripple={{ color: colors.primary['700'] }}>
                  <Ionicons name="create-outline" size={14} color="#FFF" />
                  <Text className="text-[12px] font-semibold text-white">Edit</Text>
                </Pressable>
              )}
            </View>
          </View>

          <ScheduleCalendar
            bookings={scheduledBookings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            handymanId={HANDYMAN_ID}
            availabilityRefreshKey={availRefreshKey}
            editing={isEditing}
            draftGrid={draftGrid ?? undefined}
            selectedDayIndex={selectedDayIndex}
            onCellToggle={handleCellToggle}
            onBookingPress={(bookingId) => router.push(`/booking/${bookingId}?role=handyman`)}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
