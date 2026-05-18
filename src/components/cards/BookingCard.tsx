import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus } from '../../types';
import { formatDate, formatCurrency } from '../../utils';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface BookingCardProps {
  booking: Booking;
  userType: 'client' | 'handyman';
  onPress: () => void;
  onRebook?: () => void;
  onReport?: () => void;
}

export function BookingCard({ booking, userType, onPress, onRebook, onReport }: BookingCardProps) {
  const { colors } = useTheme();
  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? '#6B7280';
  const counterpartyName = userType === 'client' ? booking.handymanName : booking.clientName;

  return (
    <TouchableOpacity onPress={onPress} className="mb-2.5 rounded-2xl bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="mb-0.5 text-[15px] font-bold text-gray-900">
            {booking.serviceCategory}
          </Text>
          <Text className="text-xs text-gray-500">
            {userType === 'client' ? 'Worker: ' : 'Client: '}
            {counterpartyName}
          </Text>
        </View>
        <View style={{ backgroundColor: `${statusColor}22` }} className="rounded-full px-2.5 py-1">
          <Text style={{ color: statusColor }} className="text-xs font-bold">
            {BOOKING_STATUS_LABELS[booking.status]}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
          <Text className="text-xs text-gray-400">{formatDate(booking.createdAt)}</Text>
        </View>
        <Text className="text-primary-700 text-base font-bold">
          {formatCurrency(booking.amount)}
        </Text>
      </View>

      {(onRebook || onReport) && booking.status === BookingStatus.Paid && (
        <View className="mt-3 flex-row gap-2 border-t border-gray-100 pt-3">
          {onRebook && (
            <TouchableOpacity
              onPress={onRebook}
              className="bg-primary-50 flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2">
              <Ionicons name="refresh-outline" size={14} color={colors.primary['600']} />
              <Text className="text-primary-600 text-xs font-semibold">Rebook</Text>
            </TouchableOpacity>
          )}
          {onReport && (
            <TouchableOpacity
              onPress={onReport}
              className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-red-50 py-2">
              <Ionicons name="flag-outline" size={14} color="#DC2626" />
              <Text className="text-xs font-semibold text-red-600">Report</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
