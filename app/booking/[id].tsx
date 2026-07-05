import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBookings } from '../../src/context/BookingsContext';
import { useTheme } from '../../src/context/ThemeContext';
import { BookingStatus } from '../../src/types';
import { MOCK_BOOKING_DETAILS } from '../../src/mocks/bookingDetails';
import { BOOKING_STATUS_LABELS } from '../../src/constants/theme';
import { BookingHeroCard } from '../../src/components/bookings/BookingHeroCard';
import { BookingOverviewTab } from '../../src/components/bookings/BookingOverviewTab';
import { BookingTimelineTab } from '../../src/components/bookings/BookingTimelineTab';
import { BookingPaymentTab } from '../../src/components/bookings/BookingPaymentTab';
import { BookingSearchingState } from '../../src/components/bookings/BookingSearchingState';
import { Tabs } from '../../src/components/ui/Tabs';

const TABS = ['Overview', 'Timeline', 'Payment'] as const;
type Tab = (typeof TABS)[number];

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getBookingById, declineBooking } = useBookings();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const prevStatusRef = useRef<BookingStatus | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const detailBooking = MOCK_BOOKING_DETAILS.find((b) => b.id === id) ?? MOCK_BOOKING_DETAILS[0];
  const liveBooking = id ? getBookingById(id) : undefined;
  const booking = liveBooking
    ? {
        ...detailBooking,
        ...liveBooking,
        reference: detailBooking.reference,
        fullAddress: detailBooking.fullAddress,
        latitude: detailBooking.latitude,
        longitude: detailBooking.longitude,
        paymentMethod: detailBooking.paymentMethod,
        paymentStatus: detailBooking.paymentStatus,
        paymentRef: detailBooking.paymentRef,
        paidAt: detailBooking.paidAt,
        notes: detailBooking.notes,
        orderDetails: detailBooking.orderDetails,
        timeline: detailBooking.timeline,
        handymanPhotoUrl: detailBooking.handymanPhotoUrl,
        handymanRating: detailBooking.handymanRating,
        handymanJobsCompleted: detailBooking.handymanJobsCompleted,
      }
    : detailBooking;
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const primaryColor = colors.primary['600'];

  // Detect PENDING → ACCEPTED transition and show confirmation
  useEffect(() => {
    if (
      prevStatusRef.current === BookingStatus.Pending &&
      booking.status === BookingStatus.Accepted
    ) {
      setShowConfirmation(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowConfirmation(false));
      }, 3000);

      return () => clearTimeout(timer);
    }
    prevStatusRef.current = booking.status;
  }, [booking.status, fadeAnim]);

  // Searching state (PENDING)
  if (booking.status === BookingStatus.Pending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <View className="px-5 pt-4">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/bookings');
            }}
            android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.ui.surface,
            })}
            className="h-9 w-9 items-center justify-center rounded-full">
            <Ionicons name="arrow-back" size={20} color={colors.ui.text} />
          </Pressable>
        </View>
        <BookingSearchingState
          booking={liveBooking ?? booking}
          onCancel={() => {
            declineBooking(booking.id);
            router.replace('/(client)');
          }}
        />
      </SafeAreaView>
    );
  }

  // Acceptance confirmation animation
  if (showConfirmation) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <Animated.View
          className="flex-1 items-center justify-center px-8"
          style={{ opacity: fadeAnim }}>
          <View
            className="mb-6 h-24 w-24 items-center justify-center rounded-full"
            style={{ backgroundColor: `${colors.primary['500']}15` }}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary['500']} />
          </View>
          <Text
            className="mb-2 text-center text-[24px] font-bold"
            style={{ color: colors.ui.text }}>
            Handyman Confirmed!
          </Text>
          <Text
            className="mb-8 text-center text-[14px] leading-5"
            style={{ color: colors.ui.textMuted }}>
            {booking.handymanName} has accepted your booking and is on the way.
          </Text>
          <View
            className="w-full rounded-2xl p-4"
            style={{ backgroundColor: colors.primary['50'] }}>
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${colors.primary['500']}15` }}>
                <Ionicons name="construct-outline" size={20} color={colors.primary['600']} />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                  {booking.serviceCategory}
                </Text>
                <Text className="text-[12px]" style={{ color: colors.ui.textMuted }}>
                  {booking.handymanName} · {booking.location}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Normal detail view
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
