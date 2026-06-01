import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NEW_BOOKING_CATEGORIES, NEW_BOOKING_HOURS } from './NewBookingConstants';

interface ReviewStepProps {
  mode: 'now' | 'later';
  categoryId: string | null;
  subServiceId: string | null;
  address: string;
  description: string;
  selectedDate: string;
  selectedHour: number;
  selectedMinute?: number;
}

export function NewBookingReviewStep({
  mode,
  categoryId,
  subServiceId,
  address,
  description,
  selectedDate,
  selectedHour,
  selectedMinute = 0,
}: ReviewStepProps) {
  const { colors } = useTheme();
  const cat = NEW_BOOKING_CATEGORIES.find((c) => c.id === categoryId);
  const svc = cat?.subServices.find((s) => s.id === subServiceId) ?? null;

  const displayHour = selectedHour % 12 === 0 ? 12 : selectedHour % 12;
  const isPm = selectedHour >= 12;
  const ampm = isPm ? 'PM' : 'AM';
  const formattedTime = `${displayHour}:${String(selectedMinute).padStart(2, '0')} ${ampm}`;

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'grid-outline', label: 'Category', value: cat?.name ?? '—' },
    { icon: 'construct-outline', label: 'Service', value: svc?.name ?? '—' },
    { icon: 'location-outline', label: 'Address', value: address || '—' },
    { icon: 'document-text-outline', label: 'Description', value: description || '—' },
    {
      icon: mode === 'now' ? 'time-outline' : 'calendar-outline',
      label: 'Schedule',
      value:
        mode === 'now'
          ? 'Book Now (Immediate)'
          : `${new Date(selectedDate).toLocaleDateString('en-PH', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })} at ${formattedTime}`,
    },
    {
      icon: 'cash-outline',
      label: 'Starting Price',
      value: svc ? `₱${svc.startingPrice}` : '—',
    },
  ];

  return (
    <View className="flex-1">
      <Text className="mb-1 text-[22px] font-bold" style={{ color: colors.ui.text }}>
        Review your booking
      </Text>
      <Text className="mb-5 text-sm" style={{ color: colors.ui.textMuted }}>
        Double-check the details before confirming.
      </Text>

      <View
        className="overflow-hidden rounded-2xl"
        style={{ borderWidth: 1, borderColor: colors.ui.border }}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            className="flex-row items-start gap-3 px-4 py-3.5"
            style={{
              backgroundColor: colors.ui.surface,
              borderBottomWidth: i < rows.length - 1 ? 1 : 0,
              borderBottomColor: colors.ui.border,
            }}>
            <View className="bg-primary-50 mt-0.5 h-8 w-8 items-center justify-center rounded-xl">
              <Ionicons name={row.icon as never} size={15} color={colors.primary['600']} />
            </View>
            <View className="flex-1">
              <Text
                className="mb-0.5 text-[11px] font-medium"
                style={{ color: colors.ui.textMuted }}>
                {row.label}
              </Text>
              <Text
                className="text-[13px] leading-5 font-semibold"
                style={{ color: colors.ui.text }}>
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View className="bg-primary-50 mt-4 flex-row items-center gap-3 rounded-2xl p-4">
        <Ionicons name="information-circle-outline" size={18} color={colors.primary['600']} />
        <Text className="text-primary-700 flex-1 text-[12px] leading-4">
          Final price will be quoted by the handyman after assessing the job on-site.
        </Text>
      </View>
    </View>
  );
}
