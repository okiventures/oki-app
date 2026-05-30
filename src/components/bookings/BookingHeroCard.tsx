import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BookingDetail } from '../../mocks/bookingDetails';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS, SERVICE_CATEGORY_ICONS } from '../../constants/theme';

interface BookingHeroCardProps {
  booking: BookingDetail;
  onContactPress?: () => void;
}

export function BookingHeroCard({ booking, onContactPress }: BookingHeroCardProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary['600'];

  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? '#6B7280';
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const categoryIconBase = SERVICE_CATEGORY_ICONS[booking.serviceCategory] ?? 'construct';
  const categoryIcon = `${categoryIconBase}-outline`;

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${primaryColor}15` }}>
          <Ionicons name={categoryIcon as any} size={22} color={primaryColor} />
        </View>

        <View className="flex-1">
          <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
            {booking.serviceCategory}
          </Text>
          <Text className="mt-0.5 text-[12px] font-normal" style={{ color: colors.ui.textMuted }}>
            {booking.bookingType === 'OnDemand' ? 'On Demand' : 'Scheduled'} · {booking.location}
          </Text>
        </View>

        <View className="items-end gap-1">
          <Text className="text-[16px] font-bold" style={{ color: primaryColor }}>
            ₱{booking.amount.toLocaleString()}
          </Text>
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: `${statusColor}18` }}>
            <Text className="text-[10px] font-semibold" style={{ color: statusColor }}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="flex-row items-center gap-3 border-t border-gray-100 px-4 py-3"
        style={{ backgroundColor: colors.primary['50'] }}>
        <Avatar name={booking.handymanName} photoUrl={booking.handymanPhotoUrl} size={36} />
        <View className="flex-1">
          <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
            {booking.handymanName}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text className="text-[11px] font-medium" style={{ color: colors.ui.textMuted }}>
              {booking.handymanRating} · {booking.handymanJobsCompleted} jobs
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onContactPress}
          android_ripple={{ color: `${primaryColor}20` }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            borderColor: `${primaryColor}40`,
          })}
          className="rounded-full border px-3 py-1.5">
          <Text className="text-[12px] font-semibold" style={{ color: primaryColor }}>
            Contact
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}
