import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus } from '../../types';
import { formatDate } from '../../utils';
import {
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
  SERVICE_CATEGORY_ICONS,
} from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { RecentActivityRow } from '../../mocks/dashboard';

interface BookingCardProps {
  booking: Booking | RecentActivityRow;
  userType?: 'client' | 'handyman';
  onPress?: () => void;
  onRebook?: () => void;
  onReport?: () => void;
}

export function BookingCard({
  booking,
  userType = 'client',
  onPress,
  onRebook,
  onReport,
}: BookingCardProps) {
  const { colors } = useTheme();

  const isRecentActivity = 'categoryId' in booking;

  let title = '';
  let subtext = '';
  let dateText = '';
  let amount = 0;
  let status: string = '';
  let categoryIcon = 'construct-outline'; // default

  if (isRecentActivity) {
    const row = booking as RecentActivityRow;
    title = row.serviceName;
    subtext = row.workerName ? `Provider: ${row.workerName}` : '';
    dateText = row.dateLabel;
    amount = row.price;
    status = row.status;

    // Map category ID to icon
    const catId = row.categoryId.toLowerCase();
    if (catId.includes('plumb')) categoryIcon = 'water-outline';
    else if (catId.includes('elect')) categoryIcon = 'flash-outline';
    else if (catId.includes('clean')) categoryIcon = 'sparkles-outline';
    else if (catId.includes('paint')) categoryIcon = 'color-palette-outline';
    else if (catId.includes('massage') || catId.includes('leaf')) categoryIcon = 'leaf-outline';
    else if (catId.includes('carp')) categoryIcon = 'hammer-outline';
    else if (catId.includes('hvac')) categoryIcon = 'thermometer-outline';
  } else {
    const std = booking as Booking;
    title = std.serviceCategory;
    const counterpartyName = userType === 'client' ? std.handymanName : std.clientName;
    subtext = counterpartyName
      ? `${userType === 'client' ? 'Worker' : 'Client'}: ${counterpartyName}`
      : '';
    dateText = formatDate(std.createdAt);
    amount = std.amount;
    status = std.status;

    // Get icon from SERVICE_CATEGORY_ICONS
    const categoryName = std.serviceCategory;
    const iconBase = SERVICE_CATEGORY_ICONS[categoryName] || 'construct';
    categoryIcon = `${iconBase}-outline`;
  }

  // Get status details:
  let statusColor = '#6B7280';
  let statusLabel = status;

  if (isRecentActivity) {
    if (status === 'Completed') {
      statusColor = '#059669'; // Green 600
    } else if (status === 'Cancelled') {
      statusColor = '#DC2626'; // Red 600
    } else if (status === 'In Progress') {
      statusColor = '#D97706'; // Amber 600
    }
  } else {
    statusColor = BOOKING_STATUS_COLORS[status] ?? '#6B7280';
    statusLabel = BOOKING_STATUS_LABELS[status] ?? status;
  }

  const isClickable = typeof onPress === 'function';

  return (
    <TouchableOpacity
      disabled={!isClickable}
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-2xl border border-gray-100 p-3.5"
      style={{
        backgroundColor: colors.ui.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
      }}>
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${colors.primary['600']}10` }}>
          <Ionicons name={categoryIcon as any} size={20} color={colors.primary['600']} />
        </View>

        <View className="flex-1 justify-center">
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.ui.text }}
            numberOfLines={1}>
            {title}
          </Text>
          {subtext ? (
            <Text
              className="mt-0.5 text-xs font-normal"
              style={{ color: colors.ui.textLight }}
              numberOfLines={1}>
              {subtext}
            </Text>
          ) : null}
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color={colors.ui.textMuted} />
            <Text className="text-[11px] font-normal" style={{ color: colors.ui.textMuted }}>
              {dateText}
            </Text>
          </View>
        </View>

        <View className="items-end justify-center gap-1.5">
          <Text className="text-[14px] font-semibold" style={{ color: colors.primary['600'] }}>
            ₱{amount.toLocaleString()}
          </Text>
          <View
            className="rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: `${statusColor}1A` }}>
            <Text className="text-[10px] font-semibold" style={{ color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {!isRecentActivity && (onRebook || onReport) && status === BookingStatus.Paid && (
        <View className="mt-3 flex-row gap-2 border-t border-gray-50 pt-3">
          {onRebook && (
            <TouchableOpacity
              onPress={onRebook}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2"
              style={{ backgroundColor: colors.primary['50'] }}>
              <Ionicons name="refresh-outline" size={14} color={colors.primary['600']} />
              <Text className="text-[11px] font-semibold" style={{ color: colors.primary['600'] }}>
                Rebook
              </Text>
            </TouchableOpacity>
          )}
          {onReport && (
            <TouchableOpacity
              onPress={onReport}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
              <Ionicons name="flag-outline" size={14} color="#EF4444" />
              <Text className="text-[11px] font-semibold text-red-500">Report</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
