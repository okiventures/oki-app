import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { Booking, BookingType } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils';

interface RequestInboxCardProps {
  booking: Booking;
  onAccept: () => void;
  onDecline: () => void;
  onViewDetails?: () => void;
}

function formatCountdown(targetDate?: string): string {
  if (!targetDate) {
    return 'No timeout';
  }

  const remainingMs = new Date(targetDate).getTime() - Date.now();
  if (remainingMs <= 0) {
    return 'Expired';
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')} left`;
}

export function RequestInboxCard({
  booking,
  onAccept,
  onDecline,
  onViewDetails,
}: RequestInboxCardProps) {
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState(() => formatCountdown(booking.requestExpiresAt));

  useEffect(() => {
    setCountdown(formatCountdown(booking.requestExpiresAt));

    if (!booking.requestExpiresAt) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown(formatCountdown(booking.requestExpiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [booking.requestExpiresAt]);

  const hasExpired = countdown === 'Expired';
  const bookingWindowLabel = useMemo(() => {
    if (booking.bookingType === BookingType.OnDemand) {
      return 'ASAP request';
    }

    return booking.scheduledAt ? formatDateTime(booking.scheduledAt) : 'Schedule pending';
  }, [booking.bookingType, booking.scheduledAt]);

  return (
    <Card className="mb-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[16px] font-semibold text-gray-900">
              {booking.serviceCategory}
            </Text>
            <Badge
              variant={booking.bookingType === BookingType.OnDemand ? 'warning' : 'primary'}
              text={booking.bookingType === BookingType.OnDemand ? 'On-demand' : 'Scheduled'}
            />
          </View>
          <View className="mt-2 gap-1.5">
            <Text className="text-[13px] leading-5 text-gray-600">
              <Text className="font-semibold text-gray-700">Problem: </Text>
              {booking.description}
            </Text>
            {booking.notes && (
              <Text className="text-[13px] leading-5 text-gray-600">
                <Text className="font-semibold text-gray-700">Notes: </Text>
                {booking.notes}
              </Text>
            )}
          </View>
        </View>

        <View className="items-end gap-2">
          <Text className="text-[16px] font-bold" style={{ color: colors.primary['700'] }}>
            {formatCurrency(booking.netAmount)}
          </Text>
          <Badge variant={hasExpired ? 'error' : 'warning'} text={countdown} />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-gray-50 px-3 py-3">
        <View className="flex-row items-center gap-3">
          <Avatar name={booking.clientName} size={38} />
          <View>
            <Text className="text-[13px] font-semibold text-gray-900">{booking.clientName}</Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text className="text-[12px] text-gray-500">
                {(booking.clientRating ?? 5).toFixed(1)} client rating
              </Text>
            </View>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-[12px] font-medium text-gray-500">Distance</Text>
          <Text className="text-[13px] font-semibold text-gray-900">
            {(booking.distanceKm ?? 0).toFixed(1)} km
          </Text>
        </View>
      </View>

      <View className="flex flex-row justify-between py-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="location-outline" size={15} color="#6B7280" />
          <Text className="text-[12px] text-gray-600">{booking.location}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="calendar-outline" size={15} color="#6B7280" />
          <Text className="text-[12px] text-gray-600">{bookingWindowLabel}</Text>
        </View>
      </View>

      {onViewDetails && (
        <Pressable
          onPress={onViewDetails}
          className="mb-1 flex-row items-center justify-center gap-1 py-2">
          <Text className="text-[13px] font-semibold" style={{ color: colors.primary['700'] }}>
            View full details
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary['700']} />
        </Pressable>
      )}

      <View className="mt-2 flex-row gap-3">
        <View className="flex-1">
          <Button
            label="Decline"
            onPress={onDecline}
            variant="tertiary"
            fullWidth
            disabled={hasExpired}
          />
        </View>
        <View className="flex-1">
          <Button label="Accept" onPress={onAccept} fullWidth disabled={hasExpired} />
        </View>
      </View>
    </Card>
  );
}
