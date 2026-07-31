import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, GestureResponderEvent } from 'react-native';
import { Booking, BookingStatus } from '../../types';
import { BOOKING_STATUS_COLORS } from '../../constants/theme';
import { hexToRgba } from '../../utils';
import { Card } from '../ui/Card';
import { useHandymanAvailability } from '../../hooks/useHandymanAvailability';
import { DEFAULT_SLOT_DURATION_MINUTES } from '../../services/searchService';

interface ScheduleCalendarProps {
  bookings: Booking[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  handymanId: string;
  availabilityRefreshKey?: number;
  editing?: boolean;
  draftGrid?: boolean[][];
  selectedDayIndex?: number;
  onCellToggle?: (dayIndex: number, hourIndex: number) => void;
  onBookingPress?: (bookingId: string) => void;
}

const HOUR_HEIGHT = 52;
const MIN_HOUR = 5;
const MAX_HOUR = 24;
const TOTAL_HOURS = MAX_HOUR - MIN_HOUR;
const LABEL_WIDTH = 52;

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
  const dayOfWeek = anchor.getDay();
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - dayOfWeek);
  const start = startOfDay(sunday);
  return Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86400000));
}

function bookingEnd(booking: Booking): Date | null {
  if (!booking.scheduledAt) return null;
  const end = new Date(booking.scheduledAt);
  end.setMinutes(end.getMinutes() + (booking.durationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES));
  return end;
}

function hourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function ScheduleCalendar({
  bookings,
  selectedDate,
  onSelectDate,
  handymanId,
  availabilityRefreshKey = 0,
  editing = false,
  draftGrid,
  selectedDayIndex = 0,
  onCellToggle,
  onBookingPress,
}: ScheduleCalendarProps) {
  const dayAnchor = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const dayEnd = useMemo(() => {
    const d = new Date(dayAnchor);
    d.setDate(d.getDate() + 1);
    return d;
  }, [dayAnchor]);

  const { availableWindows } = useHandymanAvailability({
    handymanId,
    targetDate: selectedDate,
    refreshKey: availabilityRefreshKey,
  });

  const selectedDayBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            !!b.scheduledAt &&
            b.status !== BookingStatus.Cancelled &&
            isSameDay(new Date(b.scheduledAt), selectedDate)
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledAt as string).getTime() -
            new Date(b.scheduledAt as string).getTime()
        ),
    [bookings, selectedDate]
  );

  const timelineItems = useMemo(() => {
    const items: {
      key: string;
      type: 'available' | 'booked';
      start: Date;
      end: Date;
      booking?: Booking;
    }[] = [];

    const bookingRanges = selectedDayBookings
      .map((b) => {
        const end = bookingEnd(b);
        return end
          ? ({ start: new Date(b.scheduledAt as string), end, booking: b } as {
              start: Date;
              end: Date;
              booking: Booking;
            })
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    for (const br of bookingRanges) {
      items.push({
        key: `book-${br.booking.id}`,
        type: 'booked',
        start: br.start,
        end: br.end,
        booking: br.booking,
      });
    }

    for (const aw of availableWindows) {
      if (aw.start >= dayEnd || aw.end <= dayAnchor) continue;
      let start = aw.start < dayAnchor ? dayAnchor : aw.start;
      const availEnd = aw.end > dayEnd ? dayEnd : aw.end;

      for (const br of bookingRanges) {
        if (br.start >= availEnd || br.end <= start) continue;
        if (br.start > start) {
          items.push({
            key: `avail-${start.toISOString()}`,
            type: 'available',
            start,
            end: br.start,
          });
        }
        start = br.end;
        if (start >= availEnd) break;
      }
      if (start < availEnd) {
        items.push({
          key: `avail-${start.toISOString()}`,
          type: 'available',
          start,
          end: availEnd,
        });
      }
    }

    items.sort((a, b) => a.start.getTime() - b.start.getTime());
    return items;
  }, [availableWindows, selectedDayBookings, dayAnchor, dayEnd]);

  const bookingBarElements = useMemo(() => {
    if (editing) return null;
    return selectedDayBookings
      .map((b) => {
        const end = bookingEnd(b);
        if (!end) return null;
        const startMs = new Date(b.scheduledAt as string).getTime();
        const startMin = (startMs - dayAnchor.getTime()) / 60000;
        const endMin = (end.getTime() - dayAnchor.getTime()) / 60000;
        const top = (startMin / 60 - MIN_HOUR) * HOUR_HEIGHT;
        const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
        const statusColor = BOOKING_STATUS_COLORS[b.status] ?? '#6B7280';
        return (
          <Pressable
            key={b.id}
            onPress={() => onBookingPress?.(b.id)}
            style={{
              position: 'absolute',
              top,
              left: LABEL_WIDTH,
              right: 0,
              height,
              backgroundColor: hexToRgba(statusColor, 0.15),
              borderLeftWidth: 4,
              borderLeftColor: statusColor,
            }}
            className="flex-row items-center gap-1.5 px-1.5">
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
            <Text className="flex-shrink text-[11px] font-semibold text-gray-800" numberOfLines={1}>
              {b.serviceCategory}
            </Text>
            <Text className="text-[10px] text-gray-500" numberOfLines={1}>
              {b.clientName}
            </Text>
          </Pressable>
        );
      })
      .filter(Boolean);
  }, [selectedDayBookings, editing, dayAnchor, onBookingPress]);

  const nowIndicator = useMemo(() => {
    if (!isSameDay(new Date(), selectedDate)) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = MIN_HOUR * 60;
    const endMinutes = MAX_HOUR * 60;
    if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;
    const top = ((nowMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top,
          left: LABEL_WIDTH,
          right: 0,
          height: 1.5,
          backgroundColor: '#EF4444',
          zIndex: 10,
        }}>
        <View
          style={{
            position: 'absolute',
            left: -4,
            top: -4,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: '#EF4444',
          }}
        />
      </View>
    );
  }, [selectedDate]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const bookedSlots = useMemo(() => {
    const slots = new Set<number>();
    const dayStart = startOfDay(selectedDate);
    for (const b of selectedDayBookings) {
      const start = new Date(b.scheduledAt as string);
      const end = new Date(
        start.getTime() + (b.durationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES) * 60 * 1000
      );
      const startHourIdx = Math.max(
        0,
        Math.floor((start.getTime() - dayStart.getTime()) / 1000 / 60 / 60) - MIN_HOUR
      );
      const endHourIdx =
        Math.ceil((end.getTime() - dayStart.getTime()) / 1000 / 60 / 60) - MIN_HOUR;
      for (let h = startHourIdx; h < endHourIdx; h++) {
        slots.add(h);
      }
    }
    return slots;
  }, [selectedDayBookings, selectedDate]);

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const dragFor = useRef<'set' | 'clear' | null>(null);
  const timelineRef = useRef<View>(null);

  const dragMin = dragStart != null && dragCurrent != null ? Math.min(dragStart, dragCurrent) : -1;
  const dragMax = dragStart != null && dragCurrent != null ? Math.max(dragStart, dragCurrent) : -1;

  function hourIndexAtY(y: number): number {
    return Math.max(0, Math.min(TOTAL_HOURS - 1, Math.floor(y / HOUR_HEIGHT)));
  }

  function handleGrant(e: GestureResponderEvent) {
    if (!editing || !draftGrid) return;
    const y = e.nativeEvent.locationY;
    const idx = hourIndexAtY(y);
    if (bookedSlots.has(idx)) return;
    setDragStart(idx);
    setDragCurrent(idx);
    dragFor.current = draftGrid[selectedDayIndex]?.[idx] ? 'clear' : 'set';
  }

  function handleMove(e: GestureResponderEvent) {
    if (!editing || dragStart == null) return;
    const y = e.nativeEvent.locationY;
    const idx = hourIndexAtY(y);
    if (idx !== dragCurrent) {
      setDragCurrent(idx);
    }
  }

  function handleRelease() {
    if (!editing || dragStart == null || dragCurrent == null || !onCellToggle || !draftGrid) {
      setDragStart(null);
      setDragCurrent(null);
      dragFor.current = null;
      return;
    }
    const min = Math.min(dragStart, dragCurrent);
    const max = Math.max(dragStart, dragCurrent);
    const targetValue = dragFor.current === 'set';
    for (let h = min; h <= max; h++) {
      if (bookedSlots.has(h)) continue;
      if (draftGrid[selectedDayIndex]?.[h] !== targetValue) {
        onCellToggle(selectedDayIndex, h);
      }
    }
    setDragStart(null);
    setDragCurrent(null);
    dragFor.current = null;
  }

  const hourRowElements = Array.from({ length: TOTAL_HOURS }, (_, i) => {
    const hour = MIN_HOUR + i;
    const hourStartMidnight = hour * 60;
    const hourEndMidnight = (hour + 1) * 60;

    const stored = draftGrid?.[selectedDayIndex]?.[i] ?? false;
    const isBooked = bookedSlots.has(i);
    const inDrag = i >= dragMin && i <= dragMax;
    const effectiveAvailable = inDrag ? dragFor.current === 'set' : isBooked ? false : stored;
    const hourItems = !editing
      ? timelineItems.filter((item) => {
          const itemStartMin = (item.start.getTime() - dayAnchor.getTime()) / 1000 / 60;
          const itemEndMin = (item.end.getTime() - dayAnchor.getTime()) / 1000 / 60;
          return itemStartMin < hourEndMidnight && itemEndMin > hourStartMidnight;
        })
      : [];

    const isAvail = hourItems.some((it) => it.type === 'available');
    const thisHourBookings = hourItems.filter((it) => it.type === 'booked');

    let bgColor = 'transparent';
    if (editing) {
      if (inDrag) {
        bgColor = dragFor.current === 'set' ? '#DBEAFE' : '#FEE2E2';
      } else if (isBooked) {
        bgColor = '#FEF3C7';
      } else if (stored) {
        bgColor = '#DCFCE7';
      }
    } else if (thisHourBookings.length > 0) {
      const s = thisHourBookings[0].booking!.status;
      bgColor = hexToRgba(BOOKING_STATUS_COLORS[s] ?? '#6B7280', 0.15);
    } else if (isAvail) {
      bgColor = '#F0FDF4';
    }

    const rowStyle = {
      position: 'absolute' as const,
      top: i * HOUR_HEIGHT,
      left: 0,
      right: 0,
      height: HOUR_HEIGHT,
      borderTopWidth: i === 0 ? 0 : 1,
      borderTopColor: '#F3F4F6',
      backgroundColor: bgColor,
    };

    const label = (
      <View style={{ width: LABEL_WIDTH }} className="items-end justify-start pt-1 pr-2">
        <Text
          className={`text-[11px] font-medium ${isAvail || effectiveAvailable || isBooked || stored || thisHourBookings.length > 0 ? 'text-gray-500' : 'text-gray-300'}`}>
          {hourLabel(hour)}
        </Text>
      </View>
    );

    return (
      <View key={hour} style={rowStyle}>
        <View className="flex-row" style={{ height: '100%' }}>
          {label}
          {editing ? (
            isBooked ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-[11px] font-medium text-amber-700">Booked</Text>
              </View>
            ) : inDrag ? (
              <View className="flex-1 items-center justify-center">
                <Text
                  className={`text-[11px] font-bold ${dragFor.current === 'set' ? 'text-blue-600' : 'text-red-500'}`}>
                  {dragFor.current === 'set' ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            ) : stored ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-[11px] font-medium text-green-600">Available</Text>
              </View>
            ) : null
          ) : (
            <View className="flex-1" />
          )}
        </View>
      </View>
    );
  });

  return (
    <View className="flex-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {weekDays.map((date, idx) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayBookings = bookings.filter(
            (b) =>
              b.scheduledAt &&
              b.status !== BookingStatus.Cancelled &&
              isSameDay(new Date(b.scheduledAt), date)
          );
          const dayAvailCount =
            editing && draftGrid ? (draftGrid[idx]?.filter(Boolean).length ?? 0) : 0;
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => {
                if (!editing) onSelectDate(date);
              }}
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
                {editing ? `${dayAvailCount}h` : `${dayBookings.length} booked`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card className="mx-4 mt-4 overflow-hidden">
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <View className="flex-row items-center gap-2">
            {editing ? (
              <>
                <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <Text className="text-[13px] font-medium text-gray-700">Available</Text>
                <View className="ml-2 h-2.5 w-2.5 rounded-full bg-gray-300" />
                <Text className="text-[13px] font-medium text-gray-700">Unavailable</Text>
                <View className="ml-2 h-2.5 w-2.5 rounded-full bg-amber-400" />
                <Text className="text-[13px] font-medium text-gray-700">Booked</Text>
              </>
            ) : (
              <>
                <View className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <Text className="text-[13px] font-medium text-gray-700">Available</Text>
                <View className="ml-2 h-2.5 w-2.5 rounded-full bg-amber-500" />
                <Text className="text-[13px] font-medium text-gray-700">Booked</Text>
              </>
            )}
          </View>
          {!editing && selectedDayBookings.length > 0 && (
            <View className="rounded-full bg-amber-100 px-2.5 py-0.5">
              <Text className="text-[11px] font-bold text-amber-700">
                {selectedDayBookings.length} booking{selectedDayBookings.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {editing && <Text className="text-[11px] text-gray-400">Drag to select hours</Text>}
        </View>

        {editing ? (
          <View
            ref={timelineRef}
            style={{ height: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleGrant}
            onResponderMove={handleMove}
            onResponderRelease={handleRelease}
            onResponderTerminationRequest={() => false}>
            {hourRowElements}
          </View>
        ) : (
          <ScrollView
            style={{ maxHeight: TOTAL_HOURS * HOUR_HEIGHT + 20 }}
            showsVerticalScrollIndicator={false}>
            <View style={{ height: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}>
              {hourRowElements}
              {bookingBarElements}
              {nowIndicator}
            </View>
          </ScrollView>
        )}
      </Card>

      {!editing && selectedDayBookings.length > 0 && (
        <View className="mx-4 mt-3 gap-1.5">
          {selectedDayBookings.map((b) => {
            const end = bookingEnd(b);
            const startH = new Date(b.scheduledAt as string).getHours();
            const endH = end?.getHours() ?? startH + 1;
            return (
              <Pressable
                key={b.id}
                onPress={() => onBookingPress?.(b.id)}
                className="flex-row items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5"
                android_ripple={{ color: '#F3F4F6' }}
                style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: BOOKING_STATUS_COLORS[b.status] ?? '#6B7280',
                  }}
                />
                <View className="flex-1">
                  <Text className="text-[13px] font-semibold text-gray-800">
                    {b.serviceCategory}
                  </Text>
                  <Text className="text-[11px] text-gray-500">{b.clientName}</Text>
                </View>
                <Text className="text-[11px] font-medium text-gray-400">
                  {hourLabel(startH)} – {hourLabel(endH)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
