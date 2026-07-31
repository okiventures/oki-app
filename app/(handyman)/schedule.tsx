import React, { useState, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { useBookings } from '../../src/context/BookingsContext';
import { useAuth } from '../../src/context/AuthContext';
import { ScheduleCalendar } from '../../src/components/handyman/ScheduleCalendar';
import {
  getAvailabilityForHandyman,
  setDayAvailability,
  removeDayAvailability,
} from '../../src/mocks/availability';
import { isWeeklyBlock, getBlockDayOfWeek } from '../../src/services/searchService';
import { isMockEnv } from '../../src/services/bookingService';

const DEMO_HANDYMAN_ID = 'h1';
const TOTAL_HOURS = 19;
const MIN_HOUR = 5;

function jsDayToStoreDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function buildGrid(handymanId: string): boolean[][] {
  const grid = Array.from({ length: 7 }, () => Array(TOTAL_HOURS).fill(false));
  const blocks = getAvailabilityForHandyman(handymanId);
  for (const block of blocks) {
    if (!isWeeklyBlock(block)) continue;
    const jsDay = getBlockDayOfWeek(block);
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

function buildRuns(dayHours: boolean[]): { startHour: number; endHour: number }[] {
  const runs: { startHour: number; endHour: number }[] = [];
  let runStart: number | null = null;
  for (let h = 0; h < dayHours.length; h++) {
    if (dayHours[h]) {
      if (runStart === null) runStart = h;
    } else if (runStart !== null) {
      runs.push({ startHour: runStart + MIN_HOUR, endHour: h + MIN_HOUR });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ startHour: runStart + MIN_HOUR, endHour: dayHours.length + MIN_HOUR });
  }
  return runs;
}

export default function HandymanSchedule() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { bookings: contextBookings } = useBookings();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [availRefreshKey, setAvailRefreshKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftGrid, setDraftGrid] = useState<boolean[][] | null>(null);

  const handymanId = session?.user?.id ?? DEMO_HANDYMAN_ID;
  const mockEnv = isMockEnv();

  const scheduledBookings = useMemo(() => {
    return contextBookings.filter((b) => b.handymanId === handymanId && b.scheduledAt);
  }, [contextBookings, handymanId]);

  const selectedDayIndex = selectedDate.getDay();

  function handleStartEditing() {
    setDraftGrid(buildGrid(handymanId));
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
      const dayHours = draftGrid[jsDay];
      const runs = buildRuns(dayHours);
      if (runs.length > 0) {
        setDayAvailability(handymanId, jsDayToStoreDay(jsDay), runs);
      } else {
        removeDayAvailability(handymanId, jsDayToStoreDay(jsDay));
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
              ) : mockEnv ? (
                <Pressable
                  onPress={handleStartEditing}
                  className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                  style={{ backgroundColor: colors.primary['500'] }}
                  android_ripple={{ color: colors.primary['700'] }}>
                  <Ionicons name="create-outline" size={14} color="#FFF" />
                  <Text className="text-[12px] font-semibold text-white">Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScheduleCalendar
            bookings={scheduledBookings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            handymanId={handymanId}
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
