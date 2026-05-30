import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BookingDetail } from '../../mocks/bookingDetails';
import { Button } from '../ui/Button';

import { formatDate, SectionLabel } from './BookingShared';

interface BookingOverviewTabProps {
  booking: BookingDetail;
  onRebookPress?: () => void;
  onReviewPress?: () => void;
}

function InfoRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <View
        className="h-8 w-8 items-center justify-center rounded-xl"
        style={{ backgroundColor: accent ? `${colors.primary['600']}15` : '#F3F4F6' }}>
        <Ionicons name={icon as any} size={15} color={accent ? colors.primary['600'] : '#6B7280'} />
      </View>
      <Text className="flex-1 text-[13px] font-normal" style={{ color: colors.ui.textMuted }}>
        {label}
      </Text>
      <Text
        className="max-w-[55%] text-right text-[13px] font-semibold"
        style={{ color: colors.ui.text }}
        numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="my-1 h-px bg-gray-100" />;
}

function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}>
      {children}
    </View>
  );
}

export function BookingOverviewTab({
  booking,
  onRebookPress,
  onReviewPress,
}: BookingOverviewTabProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary['600'];

  return (
    <View className="gap-5">
      <View>
        <SectionLabel label="Service Location" />
        <CardContainer>
          <View
            className="w-full items-center justify-center rounded-t-2xl"
            style={{ height: 120, backgroundColor: '#E8F0FE' }}>
            <Ionicons name="map-outline" size={24} color={primaryColor} />
            <Text className="mt-1 text-[11px] font-medium text-blue-500/80">
              Map View Placeholder
            </Text>
          </View>
          <View className="flex-row items-center gap-2 px-4 py-3">
            <Ionicons name="location-outline" size={14} color={primaryColor} />
            <Text
              className="flex-1 text-[12px] font-medium"
              style={{ color: colors.ui.text }}
              numberOfLines={2}>
              {booking.fullAddress}
            </Text>
            <Pressable
              android_ripple={{ color: `${primaryColor}20` }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                backgroundColor: `${primaryColor}12`,
              })}
              className="ml-1 rounded-full px-2.5 py-1">
              <Text className="text-[11px] font-semibold" style={{ color: primaryColor }}>
                Open Maps
              </Text>
            </Pressable>
          </View>
        </CardContainer>
      </View>

      <View>
        <SectionLabel label="Service Details" />
        <CardContainer>
          <View className="px-4">
            <InfoRow
              icon="construct-outline"
              label="Category"
              value={booking.serviceCategory}
              accent
            />
            <Divider />
            <InfoRow icon="person-outline" label="Worker" value={booking.handymanName} />
            <Divider />
            <InfoRow
              icon="calendar-outline"
              label={booking.bookingType === 'Scheduled' ? 'Scheduled For' : 'Requested At'}
              value={
                booking.scheduledAt
                  ? formatDate(booking.scheduledAt)
                  : formatDate(booking.createdAt)
              }
            />
            <Divider />
            <InfoRow
              icon={booking.bookingType === 'OnDemand' ? 'time-outline' : 'calendar-number-outline'}
              label="Booking Type"
              value={booking.bookingType === 'OnDemand' ? 'On Demand' : 'Scheduled'}
            />
            <Divider />
            <InfoRow
              icon="create-outline"
              label="Placed On"
              value={formatDate(booking.createdAt)}
            />
          </View>
        </CardContainer>
      </View>

      <View>
        <SectionLabel label="Description" />
        <CardContainer>
          <View className="px-4 py-3.5">
            <Text
              className="text-[13px] leading-[20px] font-normal"
              style={{ color: colors.ui.text }}>
              {booking.description}
            </Text>
          </View>
        </CardContainer>
      </View>

      {booking.notes && (
        <View>
          <SectionLabel label="Order Notes" />
          <CardContainer>
            <View className="flex-row gap-3 px-4 py-3.5">
              <Ionicons
                name="chatbox-ellipses-outline"
                size={16}
                color={primaryColor}
                style={{ marginTop: 1 }}
              />
              <Text
                className="flex-1 text-[13px] leading-[20px] font-normal"
                style={{ color: colors.ui.text }}>
                {booking.notes}
              </Text>
            </View>
          </CardContainer>
        </View>
      )}

      {(booking.status === 'Paid' || booking.status === 'Completed') && (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label="Rebook"
              variant="tertiary"
              fullWidth
              onPress={onRebookPress || (() => {})}
              leftIcon={<Ionicons name="refresh-outline" size={14} color={primaryColor} />}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Leave Review"
              variant="primary"
              fullWidth
              onPress={onReviewPress || (() => {})}
              leftIcon={<Ionicons name="star-outline" size={14} color="#FFF" />}
            />
          </View>
        </View>
      )}
    </View>
  );
}
