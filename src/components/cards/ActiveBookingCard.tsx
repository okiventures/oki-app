import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking, BookingStatus } from '../../types';
import { ActiveBooking, ActiveBookingStep } from '../../mocks/dashboard';
import { useTheme } from '../../context/ThemeContext';
import { Stepper } from '../ui/Stepper';
import { Button } from '../ui/Button';

const BOOKING_STEPS: string[] = ['Confirmed', 'On the way', 'Working', 'Done'];

interface PulsingBadgeProps {
  primaryColor: string;
}

function PulsingBadge({ primaryColor }: PulsingBadgeProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View className="flex-row items-center gap-1.5">
      <Animated.View
        style={{
          opacity,
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: primaryColor,
        }}
      />
      <Text className="text-xs font-medium" style={{ color: primaryColor }}>
        In progress
      </Text>
    </View>
  );
}

interface ActiveBookingCardProps {
  booking: ActiveBooking | Booking;
  onTrackPress?: () => void;
  onViewDetailsPress?: () => void;
}

export function ActiveBookingCard({
  booking,
  onTrackPress,
  onViewDetailsPress,
}: ActiveBookingCardProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary['600'];
  const primaryLight = colors.primary['100'];

  const isStandardBooking = 'serviceCategory' in booking;

  let reference = '';
  let serviceName = '';
  let estimatedCompletion = '';
  let currentStep: ActiveBookingStep = 'Confirmed';
  let workerInitials = '';
  let workerName = '';
  let workerRole = '';

  if (isStandardBooking) {
    const std = booking as Booking;
    reference = `#OKI-${std.id.toUpperCase()}`;
    serviceName = std.serviceCategory;
    estimatedCompletion = std.bookingType === 'OnDemand' ? '~30 min' : 'Scheduled';

    // Map BookingStatus to ActiveBookingStep
    if (std.status === BookingStatus.InTransit) {
      currentStep = 'On the way';
    } else if (std.status === BookingStatus.Arrived || std.status === BookingStatus.WorkStarted) {
      currentStep = 'Working';
    } else if (std.status === BookingStatus.Completed || std.status === BookingStatus.Paid) {
      currentStep = 'Done';
    } else {
      currentStep = 'Confirmed';
    }

    workerName = std.handymanName || 'Unassigned';
    workerInitials = std.handymanName
      ? std.handymanName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
      : 'OK';
    workerRole = 'Service Professional';
  } else {
    const active = booking as ActiveBooking;
    reference = active.reference;
    serviceName = active.serviceName;
    estimatedCompletion = active.estimatedCompletion;
    currentStep = active.currentStep;
    workerInitials = active.workerInitials;
    workerName = active.workerName;
    workerRole = active.workerRole;
  }

  return (
    <View
      className="mx-5 mb-5 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: colors.ui.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}>
      {/* Header band */}
      <View className="px-3.5 pt-3 pb-2.5" style={{ backgroundColor: colors.primary['50'] }}>
        <View className="mb-1 flex-row items-center justify-between">
          <PulsingBadge primaryColor={primaryColor} />
          <Text className="text-xs font-normal" style={{ color: colors.ui.textMuted }}>
            {reference}
          </Text>
        </View>
        <Text className="text-[15px] font-medium" style={{ color: colors.ui.text }}>
          {serviceName}
        </Text>
        <Text className="mt-0.5 text-xs font-normal" style={{ color: colors.ui.textLight }}>
          Est. completion: {estimatedCompletion}
        </Text>
      </View>

      {/* Body */}
      <View className="px-3.5 pb-3">
        <Stepper
          steps={BOOKING_STEPS}
          currentStep={currentStep}
          primaryColor={primaryColor}
          primaryLight={primaryLight}
        />

        <View className="mb-2.5 h-px bg-[#F0EEE9]" />

        <View className="flex-row items-center justify-between">
          {/* Worker info */}
          <View className="flex-row items-center gap-2">
            <View
              className="h-[34px] w-[34px] items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary['100'] }}>
              <Text className="text-xs font-medium" style={{ color: primaryColor }}>
                {workerInitials}
              </Text>
            </View>
            <View>
              <Text className="text-[13px] font-medium" style={{ color: colors.ui.text }}>
                {workerName}
              </Text>
              <Text className="text-xs font-normal" style={{ color: colors.ui.textLight }}>
                {workerRole}
              </Text>
            </View>
          </View>

          {/* Track button */}
          <Button
            label="Track live"
            onPress={onTrackPress || (() => {})}
            leftIcon={<Ionicons name="navigate" size={13} color="#FFF" />}
          />
        </View>
      </View>

      <Pressable
        onPress={onViewDetailsPress}
        style={({ pressed }) => ({ backgroundColor: pressed ? '#E5E7EB' : 'transparent' })}
        className="mt-1 items-center justify-center border-t border-gray-200 py-2 transition-all duration-200">
        <Text className="text-xs font-medium text-gray-500">View Details</Text>
      </Pressable>
    </View>
  );
}
