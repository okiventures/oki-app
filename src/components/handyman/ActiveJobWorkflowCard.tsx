import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../constants/theme';
import { getNextHandymanAction } from '../../context/BookingsContext';
import { Booking } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Link } from 'expo-router';

interface ActiveJobWorkflowCardProps {
  booking: Booking;
  onAdvance: () => void;
}

export function ActiveJobWorkflowCard({ booking, onAdvance }: ActiveJobWorkflowCardProps) {
  const nextAction = getNextHandymanAction(booking.status);
  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? '#6B7280';
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;

  return (
    <Card className="mb-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[12px] font-medium tracking-[1px] text-gray-500 uppercase">
            Active job
          </Text>
          <Text className="mt-1 text-[18px] font-bold text-gray-900">
            {booking.serviceCategory}
          </Text>
          <Text className="mt-1 text-[13px] text-gray-600">
            {booking.clientName} · {booking.location}
          </Text>
        </View>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: `${statusColor}18` }}>
          <Text className="text-[11px] font-semibold" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View className="mt-3 gap-2">
        <View>
          <Text className="text-[11px] tracking-[0.8px] text-gray-500 uppercase">Description</Text>
          <Text className="mt-0.5 text-[13px] leading-5 text-gray-600">{booking.description}</Text>
        </View>
        {booking.notes && (
          <View>
            <Text className="text-[11px] tracking-[0.8px] text-gray-500 uppercase">
              Order Notes
            </Text>
            <Text className="mt-0.5 text-[13px] leading-5 text-gray-600">{booking.notes}</Text>
          </View>
        )}
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-gray-50 px-3 py-3">
          <Text className="text-[11px] tracking-[0.8px] text-gray-500 uppercase">Net payout</Text>
          <Text className="mt-1 text-[16px] font-bold text-gray-900">
            {formatCurrency(booking.netAmount)}
          </Text>
        </View>
        <View className="flex-1 rounded-2xl bg-gray-50 px-3 py-3">
          <Text className="text-[11px] tracking-[0.8px] text-gray-500 uppercase">Schedule</Text>
          <Text className="mt-1 text-[13px] font-semibold text-gray-900">
            {booking.scheduledAt ? formatDateTime(booking.scheduledAt) : 'Immediate dispatch'}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Badge variant="success" text={`Client rated ${(booking.clientRating ?? 5).toFixed(1)}`} />
        <Button
          label={nextAction?.label ?? 'Awaiting payment'}
          onPress={onAdvance}
          disabled={!nextAction}
          rightIcon={
            nextAction ? <Ionicons name="arrow-forward" size={14} color="#FFFFFF" /> : undefined
          }
        />
      </View>
    </Card>
  );
}

export function ActiveJobWorkflowCardOverview({ booking, onAdvance }: ActiveJobWorkflowCardProps) {
  return (
    <Link href={`/(handyman)/requests`} asChild>
      <TouchableOpacity>
        <Card className="mb-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[12px] font-medium tracking-[1px] text-green-500 uppercase">
                Active job
              </Text>
              <Text className="mt-1 text-[18px] font-bold text-gray-900">
                {booking.serviceCategory}
              </Text>
              <Text className="mt-1 text-[13px] text-gray-600">
                {booking.clientName} · {booking.location}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Link>
  );
}
