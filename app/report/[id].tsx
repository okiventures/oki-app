import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { ReportReasonSelector } from '../../src/components/report/ReportReasonSelector';
import { MOCK_BOOKING_DETAILS } from '../../src/mocks/bookingDetails';
import { MOCK_CLIENT, MOCK_HANDYMAN } from '../../src/mocks';
import { addReport } from '../../src/mocks/reports';
import type { ReportReason } from '../../src/types';

const MAX_DESCRIPTION_LENGTH = 500;

export default function ReportUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuth();

  const booking = MOCK_BOOKING_DETAILS.find((b) => b.id === id);
  const viewerRole = session?.user?.userType ?? 'client';
  const isClient = viewerRole === 'client';
  const targetName = booking ? (isClient ? booking.handymanName : booking.clientName) : '';

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSuccess) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showSuccess, scaleAnim, fadeAnim, router]);

  const canSubmit = selectedReason !== null && description.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || !booking || !selectedReason) return;
    setSubmitting(true);

    const currentUser = isClient ? MOCK_CLIENT : MOCK_HANDYMAN;
    const targetId = isClient ? booking.handymanId : booking.clientId;

    addReport({
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reporterType: isClient ? 'client' : 'handyman',
      targetId,
      targetName,
      bookingId: booking.id,
      reason: selectedReason,
      description,
    });

    setTimeout(() => {
      setSubmitting(false);
      setShowSuccess(true);
    }, 800);
  };

  if (showSuccess) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <Animated.View
          className="flex-1 items-center justify-center px-8"
          style={{ opacity: fadeAnim }}>
          <Animated.View
            className="mb-6 h-24 w-24 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${colors.primary['500']}15`,
              transform: [{ scale: scaleAnim }],
            }}>
            <Ionicons name="checkmark-circle" size={56} color={colors.primary['500']} />
          </Animated.View>
          <Text
            className="mb-2 text-center text-[22px] font-bold"
            style={{ color: colors.ui.text }}>
            Report Submitted
          </Text>
          <Text
            className="text-center text-[14px] leading-5"
            style={{ color: colors.ui.textMuted }}>
            We&apos;ll review your report and get back to you within 24–48 hours.
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={64} color={colors.ui.textLight} />
          <Text className="mt-4 text-[18px] font-bold" style={{ color: colors.ui.text }}>
            Booking Not Found
          </Text>
          <Text className="mt-2 text-center text-[14px]" style={{ color: colors.ui.textMuted }}>
            We couldn&apos;t find the booking you&apos;re trying to report.
          </Text>
          <View className="mt-6 w-full">
            <Button label="Go Back" variant="primary" fullWidth onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
      <View className="flex-1 px-5 pt-4">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.ui.surface,
            })}
            className="h-9 w-9 items-center justify-center rounded-full">
            <Ionicons name="arrow-back" size={20} color={colors.ui.text} />
          </Pressable>
          <Text className="flex-1 text-[18px] font-bold" style={{ color: colors.ui.text }}>
            Report User
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}>
          <View className="mb-6 rounded-2xl p-4" style={{ backgroundColor: colors.ui.surface }}>
            <Text className="text-[13px] font-semibold" style={{ color: colors.ui.textMuted }}>
              Booking
            </Text>
            <Text className="mt-1 text-[15px] font-bold" style={{ color: colors.ui.text }}>
              {booking.reference}
            </Text>
            <Text className="mt-0.5 text-[13px]" style={{ color: colors.ui.textMuted }}>
              {booking.serviceCategory} · {booking.location}
            </Text>
          </View>

          <Text className="mb-1 text-[15px] font-bold" style={{ color: colors.ui.text }}>
            What happened?
          </Text>
          <Text className="mb-3 text-[12px]" style={{ color: colors.ui.textMuted }}>
            Reporting issue with {targetName}
          </Text>

          <ReportReasonSelector selected={selectedReason} onChange={setSelectedReason} />

          <Text className="mt-6 mb-2 text-[15px] font-bold" style={{ color: colors.ui.text }}>
            Describe the issue
          </Text>
          <TextInput
            placeholder="Tell us what happened in detail..."
            placeholderTextColor={colors.ui.textLight}
            multiline
            numberOfLines={5}
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={description}
            onChangeText={setDescription}
            className="rounded-2xl border p-4 text-[14px] leading-5"
            style={{
              backgroundColor: colors.ui.surface,
              borderColor: colors.ui.border,
              color: colors.ui.text,
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />
          <Text className="mt-1 text-right text-[11px]" style={{ color: colors.ui.textLight }}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>

          <Text className="mt-4 text-[12px] leading-5" style={{ color: colors.ui.textLight }}>
            Your report will be reviewed by our team. False reports may result in account
            suspension.
          </Text>
        </ScrollView>

        <View
          className="border-t px-0 pt-3 pb-6"
          style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
          <Button
            label="Submit Report"
            variant="primary"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
