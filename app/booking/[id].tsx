import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { MOCK_BOOKING_DETAILS } from '../../src/mocks/bookingDetails';
import { BOOKING_STATUS_LABELS } from '../../src/constants/theme';
import { BookingHeroCard } from '../../src/components/bookings/BookingHeroCard';
import { BookingOverviewTab } from '../../src/components/bookings/BookingOverviewTab';
import { BookingTimelineTab } from '../../src/components/bookings/BookingTimelineTab';
import { BookingPaymentTab } from '../../src/components/bookings/BookingPaymentTab';
import { Tabs } from '../../src/components/ui/Tabs';

const TABS = ['Overview', 'Timeline', 'Payment'] as const;
type Tab = (typeof TABS)[number];

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const booking = MOCK_BOOKING_DETAILS.find((b) => b.id === id) ?? MOCK_BOOKING_DETAILS[0];
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const primaryColor = colors.primary['600'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: primaryColor }}>
      <View className="px-5 pt-4 pb-24" style={{ backgroundColor: primaryColor }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/bookings');
              }
            }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-1">
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>
          <Text className="flex-1 text-center text-[17px] font-semibold text-white">
            Booking Details
          </Text>
          <Pressable
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-1">
            <Ionicons name="ellipsis-horizontal" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>
        </View>

        <View className="mt-3 flex-row items-center justify-between px-1">
          <Text className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {booking.reference}
          </Text>
          <View
            className="rounded-full px-3 py-1"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
            <Text className="text-[11px] font-semibold text-white">{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View
        className="flex-1 rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -56 }}>
        <View className="mx-5 mt-4">
          <BookingHeroCard booking={booking} />
        </View>

        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          containerStyle={{ marginHorizontal: 20, marginTop: 16 }}
        />

        <ScrollView
          className="mt-4 flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          {activeTab === 'Overview' && <BookingOverviewTab booking={booking} />}
          {activeTab === 'Timeline' && <BookingTimelineTab booking={booking} />}
          {activeTab === 'Payment' && <BookingPaymentTab booking={booking} />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
