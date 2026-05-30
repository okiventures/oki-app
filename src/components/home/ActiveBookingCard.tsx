import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveBooking, ActiveBookingStep } from '../../mocks/dashboard';
import { useTheme } from '../../context/ThemeContext';

import { Stepper } from '../ui/Stepper';

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
      {/* Animated dot – size/color are dynamic so style stays */}
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
  booking: ActiveBooking;
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
            {booking.reference}
          </Text>
        </View>
        <Text className="text-[15px] font-medium" style={{ color: colors.ui.text }}>
          {booking.serviceName}
        </Text>
        <Text className="mt-0.5 text-xs font-normal" style={{ color: colors.ui.textLight }}>
          Est. completion: {booking.estimatedCompletion}
        </Text>
      </View>

      {/* Body */}
      <View className="px-3.5 pb-3">
        <Stepper
          steps={BOOKING_STEPS}
          currentStep={booking.currentStep}
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
                {booking.workerInitials}
              </Text>
            </View>
            <View>
              <Text className="text-[13px] font-medium" style={{ color: colors.ui.text }}>
                {booking.workerName}
              </Text>
              <Text className="text-xs font-normal" style={{ color: colors.ui.textLight }}>
                {booking.workerRole}
              </Text>
            </View>
          </View>

          {/* Track button */}
          <TouchableOpacity
            onPress={onTrackPress}
            accessibilityLabel="Track live"
            className="flex-row items-center gap-1 rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: primaryColor }}>
            <Ionicons name="navigate" size={13} color="#FFF" />
            <Text className="text-xs font-medium text-white">Track live</Text>
          </TouchableOpacity>
        </View>
        <View />
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
