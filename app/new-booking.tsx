import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { Button } from '../src/components/ui/Button';

import { NEW_BOOKING_STEPS } from '../src/components/bookings/NewBookingConstants';
import { NewBookingCategoryStep } from '../src/components/bookings/NewBookingCategoryStep';
import { NewBookingDetailsStep } from '../src/components/bookings/NewBookingDetailsStep';
import { NewBookingScheduleStep } from '../src/components/bookings/NewBookingScheduleStep';
import { NewBookingReviewStep } from '../src/components/bookings/NewBookingReviewStep';
import { NewBookingStepDots } from '../src/components/bookings/NewBookingStepDots';

export default function NewBookingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'now' | 'later' }>();
  const [bookingMode, setBookingMode] = useState<'now' | 'later'>(
    mode === 'later' ? 'later' : 'now'
  );
  const router = useRouter();
  const { colors } = useTheme();

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subServiceId, setSubServiceId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const stepIndex = step;

  const canAdvance = (): boolean => {
    if (stepIndex === 0) return categoryId !== null && !!subServiceId;
    if (stepIndex === 1) return address.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    if (stepIndex < NEW_BOOKING_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setConfirmed(true);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="mb-6 h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.primary['50'] }}>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary['600']} />
          </View>
          <Text
            className="mb-2 text-center text-[24px] font-bold"
            style={{ color: colors.ui.text }}>
            Booking Submitted!
          </Text>
          <Text
            className="mb-8 text-center text-[14px] leading-6"
            style={{ color: colors.ui.textMuted }}>
            {bookingMode === 'now'
              ? "We're finding the nearest available handyman. You'll be notified once confirmed."
              : "Your booking request has been sent. You'll receive confirmation soon."}
          </Text>
          <Button
            label="Back to Home"
            onPress={() => router.replace('/(client)')}
            fullWidth
            style={{ paddingVertical: 14 }}
          />
          <View className="mt-3 w-full">
            <Button
              label="View My Bookings"
              onPress={() => router.push('/bookings')}
              variant="tertiary"
              fullWidth
              style={{ paddingVertical: 14 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}
      edges={['top', 'left', 'right', 'bottom']}>
      <View className="px-5 pt-3 pb-6">
        <View className="mb-5 flex-row items-center justify-between">
          <Pressable
            onPress={handleBack}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-1">
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>
          <Text className="flex-1 text-center text-[16px] font-semibold text-white">
            {bookingMode === 'now' ? 'Book Now' : 'Schedule a Service'}
          </Text>
          <View className="w-6" />
        </View>

        <Text
          className="mb-2 text-center text-[12px] font-medium"
          style={{ color: 'rgba(255,255,255,0.65)' }}>
          Step {stepIndex + 1} of {NEW_BOOKING_STEPS.length} — {NEW_BOOKING_STEPS[stepIndex]}
        </Text>

        <NewBookingStepDots steps={NEW_BOOKING_STEPS} current={stepIndex} />
      </View>

      <View
        className="flex-1 rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -8 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {stepIndex === 0 && (
            <NewBookingCategoryStep
              selected={categoryId}
              selectedSubService={subServiceId}
              onSelect={(id) => {
                setCategoryId(id);
                setSubServiceId(null);
              }}
              onSelectSubService={setSubServiceId}
            />
          )}
          {stepIndex === 1 && (
            <NewBookingDetailsStep
              address={address}
              description={description}
              notes={notes}
              onAddressChange={setAddress}
              onDescriptionChange={setDescription}
              onNotesChange={setNotes}
            />
          )}
          {stepIndex === 2 && (
            <NewBookingScheduleStep
              mode={bookingMode}
              selectedDate={selectedDate}
              selectedHour={selectedHour}
              selectedMinute={selectedMinute}
              onDateChange={setSelectedDate}
              onHourChange={setSelectedHour}
              onMinuteChange={setSelectedMinute}
              onSwitchMode={(newMode) => setBookingMode(newMode)}
            />
          )}
          {stepIndex === 3 && (
            <NewBookingReviewStep
              mode={bookingMode}
              categoryId={categoryId}
              subServiceId={subServiceId}
              address={address}
              description={description}
              notes={notes}
              selectedDate={selectedDate}
              selectedHour={selectedHour}
              selectedMinute={selectedMinute}
            />
          )}
        </ScrollView>

        <View
          className="absolute right-0 bottom-0 left-0 px-6 pt-4 pb-8"
          style={{
            backgroundColor: colors.ui.background,
            borderTopWidth: 1,
            borderTopColor: colors.ui.border,
          }}>
          <Button
            label={stepIndex < NEW_BOOKING_STEPS.length - 1 ? 'Continue' : 'Confirm Booking'}
            onPress={handleNext}
            disabled={!canAdvance()}
            fullWidth
            style={{ paddingVertical: 14 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
