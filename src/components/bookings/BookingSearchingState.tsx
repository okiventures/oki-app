import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Booking } from '../../types';
import { Button } from '../ui/Button';

interface BookingSearchingStateProps {
  booking: Booking;
  onCancel?: () => void;
}

export function BookingSearchingState({ booking, onCancel }: BookingSearchingStateProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.View
        className="mb-8 h-28 w-28 items-center justify-center rounded-full"
        style={{
          backgroundColor: `${colors.primary['500']}15`,
          opacity: pulseAnim,
          transform: [{ rotate: rotateInterpolation }],
        }}>
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: `${colors.primary['500']}20` }}>
          <Ionicons name="search" size={40} color={colors.primary['500']} />
        </View>
      </Animated.View>

      <Text className="mb-2 text-center text-[22px] font-bold" style={{ color: colors.ui.text }}>
        Finding a handyman
      </Text>
      <Text
        className="mb-8 text-center text-[14px] leading-5"
        style={{ color: colors.ui.textMuted }}>
        We&apos;re looking for nearby available handymen for your request. You&apos;ll be notified
        as soon as one accepts.
      </Text>

      <View className="w-full rounded-2xl p-4" style={{ backgroundColor: colors.primary['50'] }}>
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
              {booking.description}
            </Text>
          </View>
        </View>
      </View>

      {onCancel && (
        <View className="mt-8 w-full">
          <Button
            label="Cancel Request"
            onPress={onCancel}
            variant="tertiary"
            fullWidth
            style={{ paddingVertical: 14 }}
          />
        </View>
      )}
    </View>
  );
}
