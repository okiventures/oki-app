import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import {
  getNextHandymanAction,
  useBookings,
  ACTIVE_HANDYMAN_BOOKING_STATUSES,
} from '../../src/context/BookingsContext';
import { BookingStatus } from '../../src/types';
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { formatCurrency, formatDateTime, getInitials } from '../../src/utils';

// Short, human-readable reference derived from the booking UUID.
function bookingReference(id: string | undefined): string {
  if (!id) return '#--------';
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.Completed,
  BookingStatus.Paid,
  BookingStatus.Cancelled,
  BookingStatus.Rejected,
];

export default function HandymanJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { getBookingById, acceptBooking, declineBooking, advanceBooking } = useBookings();
  const [pendingAction, setPendingAction] = useState<'accept' | 'decline' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const booking = id ? getBookingById(id) : undefined;
  const primaryColor = colors.primary['600'];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(handyman)/requests');
  };

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <View className="px-5 pt-4">
          <Pressable onPress={goBack} className="h-9 w-9 items-center justify-center rounded-full">
            <Ionicons name="arrow-back" size={20} color={colors.ui.text} />
          </Pressable>
        </View>
        <EmptyState
          icon="briefcase-outline"
          title="Job not found"
          message="This job may have been reassigned or is no longer available."
        />
      </SafeAreaView>
    );
  }

  const statusColor = BOOKING_STATUS_COLORS[booking.status] ?? '#6B7280';
  const statusLabel = BOOKING_STATUS_LABELS[booking.status] ?? booking.status;
  const isPending = booking.status === BookingStatus.Pending;
  const isActive = ACTIVE_HANDYMAN_BOOKING_STATUSES.includes(booking.status);
  const isTerminal = TERMINAL_STATUSES.includes(booking.status);
  const nextAction = getNextHandymanAction(booking.status);

  const confirmAction = async () => {
    if (!pendingAction || isSubmitting) return;
    const action = pendingAction;

    setIsSubmitting(true);
    try {
      if (action === 'accept') {
        await acceptBooking(booking.id);
        setPendingAction(null);
      } else {
        await declineBooking(booking.id);
        setPendingAction(null);
        goBack();
      }
    } catch {
      Alert.alert(
        action === 'accept' ? 'Could not accept job' : 'Could not decline job',
        'Something went wrong. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactClient = (mode: 'call' | 'message') => {
    if (!isActive) {
      Alert.alert(
        'Contact locked',
        'A masked contact channel opens once you accept and are en route to the job.'
      );
      return;
    }
    // Masked calling/messaging is provisioned in a later milestone; open the
    // device handler as a best-effort shortcut until then.
    const url = mode === 'call' ? 'tel:' : 'sms:';
    Linking.openURL(url).catch(() => {
      Alert.alert('Unavailable', 'No contact app is available on this device.');
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: primaryColor }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-24" style={{ backgroundColor: primaryColor }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={goBack} className="p-1">
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>
          <Text className="flex-1 text-center text-[17px] font-semibold text-white">
            Job Details
          </Text>
          <View className="w-6" />
        </View>

        <View className="mt-3 flex-row items-center justify-between px-1">
          <Text className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {bookingReference(booking.id)}
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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          {/* Service summary */}
          <Card className="mb-4">
            <Text className="text-[11px] font-medium tracking-[1px] text-gray-500 uppercase">
              Service
            </Text>
            <Text className="mt-1 text-[20px] font-bold text-gray-900">
              {booking.serviceCategory || 'Service request'}
            </Text>
            <View className="mt-3">
              <Text className="text-[11px] tracking-[0.8px] text-gray-500 uppercase">
                Description
              </Text>
              <Text className="mt-0.5 text-[13px] leading-5 text-gray-600">
                {booking.description || 'No description provided.'}
              </Text>
            </View>
            {booking.notes ? (
              <View className="mt-3">
                <Text className="text-[11px] tracking-[0.8px] text-gray-500 uppercase">
                  Order notes
                </Text>
                <Text className="mt-0.5 text-[13px] leading-5 text-gray-600">{booking.notes}</Text>
              </View>
            ) : null}
          </Card>

          {/* Client info + contact */}
          <Card className="mb-4">
            <Text className="text-[11px] font-medium tracking-[1px] text-gray-500 uppercase">
              Client
            </Text>
            <View className="mt-2 flex-row items-center gap-3">
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${primaryColor}15` }}>
                <Text className="text-[15px] font-bold" style={{ color: primaryColor }}>
                  {getInitials(booking.clientName || 'Client')}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-gray-900">
                  {booking.clientName || 'Client'}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text className="text-[12px] text-gray-500">
                    {(booking.clientRating ?? 5).toFixed(1)} client rating
                  </Text>
                </View>
              </View>
            </View>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => contactClient('call')}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3"
                style={{ backgroundColor: colors.ui.surface }}>
                <Ionicons name="call-outline" size={16} color={colors.ui.text} />
                <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                  Call
                </Text>
              </Pressable>
              <Pressable
                onPress={() => contactClient('message')}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-3"
                style={{ backgroundColor: colors.ui.surface }}>
                <Ionicons name="chatbubble-outline" size={16} color={colors.ui.text} />
                <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                  Message
                </Text>
              </Pressable>
            </View>
          </Card>

          {/* Location */}
          <Card className="mb-4">
            <Text className="text-[11px] font-medium tracking-[1px] text-gray-500 uppercase">
              Address
            </Text>
            <View className="mt-2 flex-row items-start gap-2">
              <Ionicons name="location-outline" size={16} color={primaryColor} />
              <Text className="flex-1 text-[13px] leading-5 text-gray-700">
                {booking.location || 'Address unavailable'}
              </Text>
            </View>
          </Card>

          {/* Earnings */}
          <Card className="mb-4">
            <Text className="text-[11px] font-medium tracking-[1px] text-gray-500 uppercase">
              Agreed price
            </Text>
            <View className="mt-2 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-600">Job total</Text>
                <Text className="text-[13px] font-semibold text-gray-900">
                  {formatCurrency(booking.amount)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-600">Platform fee</Text>
                <Text className="text-[13px] font-semibold text-gray-500">
                  −{formatCurrency(booking.platformFee)}
                </Text>
              </View>
              <View className="mt-1 flex-row items-center justify-between border-t border-gray-100 pt-2">
                <Text className="text-[13px] font-semibold text-gray-900">Your net payout</Text>
                <Text className="text-[16px] font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(booking.netAmount)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Schedule + timestamps */}
          <Card className="mb-4">
            <Text className="text-[11px] font-medium tracking-[1px] text-gray-500 uppercase">
              Schedule
            </Text>
            <View className="mt-2 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-600">Type</Text>
                <Text className="text-[13px] font-semibold text-gray-900">
                  {booking.scheduledAt ? formatDateTime(booking.scheduledAt) : 'Immediate dispatch'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-600">Requested</Text>
                <Text className="text-[13px] font-semibold text-gray-900">
                  {formatDateTime(booking.createdAt)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-600">Last updated</Text>
                <Text className="text-[13px] font-semibold text-gray-900">
                  {formatDateTime(booking.updatedAt)}
                </Text>
              </View>
            </View>
          </Card>

          {/* State-driven CTA */}
          {isPending ? (
            <View className="mt-1 flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Decline"
                  variant="secondary"
                  onPress={() => setPendingAction('decline')}
                />
              </View>
              <View className="flex-1">
                <Button label="Accept job" onPress={() => setPendingAction('accept')} />
              </View>
            </View>
          ) : nextAction ? (
            <Button
              label={nextAction.label}
              onPress={() => advanceBooking(booking.id)}
              rightIcon={<Ionicons name="arrow-forward" size={14} color="#FFFFFF" />}
            />
          ) : isTerminal ? (
            <View
              className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl py-4"
              style={{ backgroundColor: `${statusColor}12` }}>
              <Ionicons name="checkmark-circle-outline" size={16} color={statusColor} />
              <Text className="text-[13px] font-semibold" style={{ color: statusColor }}>
                This job is {statusLabel.toLowerCase()} — no further action needed.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={pendingAction !== null}
        title={pendingAction === 'accept' ? 'Accept this job?' : 'Decline this job?'}
        message={
          pendingAction === 'accept'
            ? 'The client will be notified that you accepted and are assigned to this booking.'
            : 'This job will be marked as Rejected and removed from your inbox. The client is notified so it can be re-offered.'
        }
        confirmLabel={pendingAction === 'accept' ? 'Accept job' : 'Decline job'}
        cancelLabel="Keep reviewing"
        danger={pendingAction === 'decline'}
        loading={isSubmitting}
        onConfirm={confirmAction}
        onCancel={() => {
          if (!isSubmitting) setPendingAction(null);
        }}
      />
    </SafeAreaView>
  );
}
