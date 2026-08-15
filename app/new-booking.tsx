import React, { useState, useCallback, useMemo } from 'react';
import { Alert, View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { useBookings } from '../src/context/BookingsContext';
import { useAuth } from '../src/context/AuthContext';
import { useProfile } from '../src/hooks/useProfile';
import { isMockEnv } from '../src/services/bookingService';
import { MOCK_CLIENT } from '../src/mocks';
import { BookingType, ServiceCategory } from '../src/types';
import { useHandymanAvailability } from '../src/hooks/useHandymanAvailability';
import { Button } from '../src/components/ui/Button';

import {
  NEW_BOOKING_STEPS,
  NEW_BOOKING_CATEGORIES,
} from '../src/components/bookings/NewBookingConstants';
import { NewBookingCategoryStep } from '../src/components/bookings/NewBookingCategoryStep';
import { NewBookingDetailsStep } from '../src/components/bookings/NewBookingDetailsStep';
import { NewBookingScheduleStep } from '../src/components/bookings/NewBookingScheduleStep';
import { NewBookingReviewStep } from '../src/components/bookings/NewBookingReviewStep';
import { NewBookingStepDots } from '../src/components/bookings/NewBookingStepDots';

import { supabase } from '../src/lib/supabase';

const CATEGORY_TO_SERVICE: Record<string, ServiceCategory> = {
  massage: ServiceCategory.General,
  cleaning: ServiceCategory.Cleaning,
  painting: ServiceCategory.Painting,
  general: ServiceCategory.General,
};

const SUB_SERVICE_TO_SLUG: Record<string, string> = {
  // Cleaning
  'cleaning-general': 'cleaning-general',
  'cleaning-deep': 'cleaning-general',
  'cleaning-aircon': 'cleaning-general',
  'cleaning-laundry': 'cleaning-general',
  // Painting
  'painting-interior': 'painting-interior',
  'painting-exterior': 'painting-interior',
  'painting-touch': 'painting-interior',
  // Massage → no DB match, use general
  'massage-swedish': 'general-handyman',
  'massage-deep': 'general-handyman',
  'massage-shiatsu': 'general-handyman',
  'massage-foot': 'general-handyman',
  // General
  'general-furniture': 'general-handyman',
  'general-mounting': 'general-handyman',
  'general-repair': 'general-handyman',
  'general-other': 'general-handyman',
};

const DEFAULT_LAT = 10.3157;
const DEFAULT_LNG = 123.8854;

export default function NewBookingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'now' | 'later' }>();
  const [bookingMode, setBookingMode] = useState<'now' | 'later'>(
    mode === 'later' ? 'later' : 'now'
  );
  const router = useRouter();
  const { colors } = useTheme();
  const { createBooking } = useBookings();
  const { session } = useAuth();
  const { profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientId = session?.user?.id ?? (isMockEnv() ? MOCK_CLIENT.id : '');
  const clientName = profile?.user?.full_name ?? (isMockEnv() ? MOCK_CLIENT.name : '');

  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subServiceId, setSubServiceId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const stepIndex = step;

  const targetDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const { isTimeSlotBlocked } = useHandymanAvailability({ targetDate });

  const isSelectedSlotBlocked = useMemo(() => {
    if (bookingMode !== 'later') return false;
    return isTimeSlotBlocked(selectedHour);
  }, [bookingMode, selectedHour, isTimeSlotBlocked]);

  const canAdvance = (): boolean => {
    if (stepIndex === 0) return categoryId !== null && !!subServiceId;
    if (stepIndex === 1) return address.trim().length > 0 && description.trim().length > 0;
    if (stepIndex === 2 && bookingMode === 'later') return !isSelectedSlotBlocked;
    return true;
  };

  const findAmount = useCallback((): number => {
    if (!categoryId || !subServiceId) return 0;
    const cat = NEW_BOOKING_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return 0;
    const sub = cat.subServices.find((s) => s.id === subServiceId);
    return sub?.startingPrice ?? 0;
  }, [categoryId, subServiceId]);

  const handleNext = useCallback(async () => {
    if (stepIndex < NEW_BOOKING_STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    if (!categoryId || !subServiceId || !address.trim()) return;

    setIsSubmitting(true);
    try {
      const serviceCategory = CATEGORY_TO_SERVICE[categoryId] ?? ServiceCategory.General;
      const scheduledAt =
        bookingMode === 'later'
          ? `${selectedDate}T${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}:00`
          : undefined;

      // Look up service ID from slug. Mock mode has no backend to ask, and the
      // request would stall on an unreachable host before createBooking falls
      // back to a local booking anyway.
      let serviceId: string | undefined;
      if (!isMockEnv()) {
        const slug = SUB_SERVICE_TO_SLUG[subServiceId] ?? 'general-handyman';
        const { data: svc } = await supabase
          .from('services')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        serviceId = svc?.id;
        if (!serviceId) {
          console.warn(`createBooking: no service found for slug "${slug}"`);
        }
      }

      // create-booking derives the client from the JWT, so these two only
      // matter for the offline demo — but hardcoding them meant a live booking
      // came back labelled "Ishah Bautista" until the next refresh.
      const booking = await createBooking({
        clientId,
        clientName,
        serviceCategory,
        bookingType: bookingMode === 'now' ? BookingType.OnDemand : BookingType.Scheduled,
        description,
        location: address,
        amount: findAmount(),
        serviceId,
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        scheduledAt,
        notes: notes || undefined,
      });

      router.replace(`/booking/${booking.id}`);
    } catch (err) {
      // createBooking throws on a failed edge-function call. This used to be a
      // bare `catch {}`, so Confirm did nothing at all and the user was left on
      // the review step with no idea the booking never got placed.
      Alert.alert(
        'Could not place booking',
        err instanceof Error ? err.message : 'Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    stepIndex,
    categoryId,
    subServiceId,
    address,
    bookingMode,
    selectedDate,
    selectedHour,
    selectedMinute,
    description,
    notes,
    findAmount,
    createBooking,
    router,
    clientId,
    clientName,
  ]);

  const handleBack = () => {
    if (stepIndex > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

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
              isSelectedSlotBlocked={isSelectedSlotBlocked}
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
            label={
              isSubmitting
                ? 'Submitting...'
                : stepIndex < NEW_BOOKING_STEPS.length - 1
                  ? 'Continue'
                  : 'Confirm Booking'
            }
            onPress={handleNext}
            disabled={!canAdvance() || isSubmitting}
            fullWidth
            style={{ paddingVertical: 14 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
