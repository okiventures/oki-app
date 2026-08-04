import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { StarRatingInput } from '../../src/components/ui/StarRatingInput';
import { MOCK_BOOKING_DETAILS } from '../../src/mocks/bookingDetails';
import { submitReview } from '../../src/services/reviewService';

const MAX_COMMENT_LENGTH = 500;

export default function ReviewBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuth();

  const booking = MOCK_BOOKING_DETAILS.find((b) => b.id === id);
  const viewerRole = session?.user?.userType ?? 'client';
  const isClient = viewerRole === 'client';

  const targetName = booking ? (isClient ? booking.handymanName : booking.clientName) : '';
  const targetPhoto = isClient && booking ? booking.handymanPhotoUrl : undefined;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canSubmit = rating > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !booking) return;
    setSubmitting(true);
    setError(null);

    const isClientViewer = isClient;
    const meId = isClientViewer ? booking.clientId : booking.handymanId;
    const meName = isClientViewer ? booking.clientName : booking.handymanName;
    const revieweeId = isClientViewer ? booking.handymanId : booking.clientId;
    const targetPhoto = isClientViewer ? booking.handymanPhotoUrl : undefined;

    try {
      await submitReview({
        bookingId: booking.id,
        reviewerId: meId,
        reviewerName: meName,
        reviewerPhotoUrl: targetPhoto,
        revieweeId,
        rating,
        comment,
      });
      setShowSuccess(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to submit review';
      setError(message);
      setSubmitting(false);
    }
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
            Review Submitted
          </Text>
          {rating >= 4 ? (
            <Text
              className="text-center text-[14px] leading-5"
              style={{ color: colors.ui.textMuted }}>
              Thank you for your feedback! We&apos;re glad you had a great experience.
            </Text>
          ) : (
            <Text
              className="text-center text-[14px] leading-5"
              style={{ color: colors.ui.textMuted }}>
              Thanks for your honest review. Your feedback helps us improve.
            </Text>
          )}
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
            We couldn&apos;t find the booking you&apos;re looking for.
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
            Leave a Review
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}>
          <View className="mb-8 items-center">
            {isClient && targetPhoto ? (
              <Avatar name={targetName} photoUrl={targetPhoto} size={72} />
            ) : (
              <Avatar name={targetName} size={72} />
            )}
            <Text className="mt-3 text-[17px] font-bold" style={{ color: colors.ui.text }}>
              {targetName}
            </Text>
            <Text className="mt-0.5 text-[13px]" style={{ color: colors.ui.textMuted }}>
              {booking.serviceCategory}
            </Text>
          </View>

          <Text
            className="mb-3 text-center text-[15px] font-bold"
            style={{ color: colors.ui.text }}>
            Rate your experience
          </Text>

          <StarRatingInput rating={rating} onChange={setRating} size={36} />

          {rating > 0 && (
            <View className="mt-8">
              <Text className="mb-2 text-[15px] font-bold" style={{ color: colors.ui.text }}>
                Share your thoughts (optional)
              </Text>
              <TextInput
                placeholder="What was your experience like?"
                placeholderTextColor={colors.ui.textLight}
                multiline
                numberOfLines={4}
                maxLength={MAX_COMMENT_LENGTH}
                value={comment}
                onChangeText={setComment}
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
                {comment.length}/{MAX_COMMENT_LENGTH}
              </Text>
            </View>
          )}
        </ScrollView>

        <View
          className="border-t px-0 pt-3 pb-6"
          style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
          {error ? (
            <View className="mb-3 flex-row items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text className="flex-1 text-[13px] leading-4 text-red-600">{error}</Text>
            </View>
          ) : null}
          <Button
            label="Submit Review"
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
