import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookingStatus } from '../../types';
import { TimelineEvent } from '../../mocks/bookingDetails';
import { BOOKING_STATUS_COLORS } from '../../constants/theme';

interface VerticalStepperProps {
  events: TimelineEvent[];
  currentStatus: BookingStatus;
  primaryColor: string;
  primaryLight: string;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const STATUS_ORDER: BookingStatus[] = [
  BookingStatus.Pending,
  BookingStatus.Accepted,
  BookingStatus.InTransit,
  BookingStatus.Arrived,
  BookingStatus.WorkStarted,
  BookingStatus.Completed,
  BookingStatus.Paid,
];

const STATUS_ICONS: Partial<Record<BookingStatus, string>> = {
  [BookingStatus.Pending]: 'time-outline',
  [BookingStatus.Accepted]: 'checkmark-circle-outline',
  [BookingStatus.InTransit]: 'navigate-outline',
  [BookingStatus.Arrived]: 'location-outline',
  [BookingStatus.WorkStarted]: 'construct-outline',
  [BookingStatus.Completed]: 'checkmark-done-circle-outline',
  [BookingStatus.Paid]: 'wallet-outline',
  [BookingStatus.Cancelled]: 'close-circle-outline',
};

export function VerticalStepper({
  events,
  currentStatus,
  primaryColor,
  primaryLight,
}: VerticalStepperProps) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  return (
    <View className="px-1">
      {events.map((event, idx) => {
        const eventIdx = STATUS_ORDER.indexOf(event.status);
        const isCompleted = eventIdx < currentIdx || event.timestamp !== null;
        const isActive = event.status === currentStatus;
        const isFuture = !isCompleted && !isActive;
        const isLast = idx === events.length - 1;

        const dotColor = isActive
          ? primaryColor
          : isCompleted
            ? '#10B981'
            : '#D1D5DB';
        const iconColor = isActive ? primaryColor : isCompleted ? '#10B981' : '#9CA3AF';
        const iconName = (STATUS_ICONS[event.status] ?? 'ellipse-outline') as any;

        return (
          <View key={event.id} className="flex-row">
            <View className="items-center" style={{ width: 36 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isActive
                    ? primaryLight
                    : isCompleted
                      ? '#D1FAE5'
                      : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isActive ? 2 : 0,
                  borderColor: isActive ? primaryColor : 'transparent',
                  shadowColor: isActive ? primaryColor : 'transparent',
                  shadowOpacity: isActive ? 0.3 : 0,
                  shadowRadius: isActive ? 6 : 0,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: isActive ? 3 : 0,
                }}>
                <Ionicons name={iconName} size={15} color={iconColor} />
              </View>

              {!isLast && (
                <View
                  style={{
                    flex: 1,
                    width: 2,
                    marginTop: 2,
                    marginBottom: 2,
                    backgroundColor: isCompleted ? '#10B981' : '#E5E7EB',
                    opacity: isCompleted ? 0.6 : 1,
                  }}
                />
              )}
            </View>

            <View
              className="flex-1 pb-5 pl-3"
              style={{ opacity: isFuture ? 0.45 : 1 }}>
              <View className="flex-row items-start justify-between">
                <Text
                  className="text-[13px] font-semibold flex-1 pr-2"
                  style={{
                    color: isActive ? primaryColor : isCompleted ? '#1C1917' : '#6B7280',
                  }}>
                  {event.label}
                </Text>
                {event.timestamp && (
                  <Text
                    className="text-[11px] font-normal"
                    style={{ color: '#9CA3AF' }}>
                    {formatTimestamp(event.timestamp)}
                  </Text>
                )}
              </View>
              <Text
                className="mt-0.5 text-[12px] font-normal leading-[17px]"
                style={{ color: '#6B7280' }}>
                {event.description}
              </Text>
              {isActive && (
                <View
                  className="mt-1.5 self-start rounded-full px-2 py-0.5"
                  style={{ backgroundColor: `${primaryColor}18` }}>
                  <Text className="text-[10px] font-semibold" style={{ color: primaryColor }}>
                    Current Status
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
