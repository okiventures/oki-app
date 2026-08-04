import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { StarRatingInput } from '../../src/components/ui/StarRatingInput';
import { Toast } from '../../src/components/ui/Toast';
import { useBookingDetail } from '../../src/hooks/useBookingDetail';
import { MOCK_CLIENT, MOCK_HANDYMAN } from '../../src/mocks';
import {
  fetchMyReviewForBooking,
  submitReview,
  ReviewSubmissionError,
} from '../../src/services/reviewService';
import { BookingStatus, ToastMessage } from '../../src/types';

const MAX_COMMENT_LENGTH = 500;

export default function ReviewBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuth();

  const { detail: booking, isLoading } = useBookingDetail(id);
  const viewerRole = session?.user?.userType ?? 'client';
  const isClient = viewerRole === 'client';

  const targetName = booking ? (isClient ? booking.handymanName : booking.clientName) : '';
  const targetPhoto = isClient && booking ? booking.handymanPhotoUrl : undefined;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // reviews_one_per_direction allows one review per booking per reviewer, so
  // check before showing the form rather than failing on submit.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchMyReviewForBooking(id)
      .then((existing) => {
        if (!cancelled && existing) setAlreadyReviewed(true);
      })
      .catch(() => {
        // Non-fatal: the insert is still guarded server-side.
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  // Only a finished job can be reviewed — the RLS insert policy enforces the
  // same thing, this just keeps the button from lying about it.
  const isReviewable =
    booking?.status === BookingStatus.Completed || booking?.status === BookingStatus.Paid;
  const canSubmit = rating > 0 && isReviewable && !alreadyReviewed && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !booking) return;
    setSubmitting(true);

    // Client reviews the handyman; handyman reviews the client. reviewerId only
    // feeds the mock path — the Edge Function derives it from the session.
    const reviewerId = isClient
      ? (session?.user?.id ?? MOCK_CLIENT.id)
      : (session?.user?.id ?? MOCK_HANDYMAN.id);

    try {
      await submitReview({
        bookingId: booking.id,
        reviewerId,
        revieweeId: isClient ? booking.handymanId : booking.clientId,
        rating,
        comment,
      });
      setShowSuccess(true);
    } catch (err) {
      // The 409 is the one-review-per-direction guard, worth naming explicitly.
      if (err instanceof ReviewSubmissionError && err.status === 409) {
        setAlreadyReviewed(true);
      }
      setToast({
        id: `review-error-${String(rating)}-${booking.id}`,
        type: 'error',
        message:
          err instanceof ReviewSubmissionError && err.status === 409
            ? 'You have already reviewed this booking.'
            : err instanceof Error
              ? err.message
              : 'Could not submit review. Please try again.',
      });
    } finally {
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
              Thank you for your feedback! We are glad you had a great experience.
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

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.ui.background }}
        className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary['600']} />
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
            We could not find the booking you are looking for.
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

          {alreadyReviewed ? (
            <View
              className="flex-row gap-3 rounded-2xl px-4 py-3.5"
              style={{ backgroundColor: `${colors.primary['600']}08` }}>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={colors.primary['600']}
                style={{ marginTop: 1 }}
              />
              <Text className="flex-1 text-[13px] leading-5" style={{ color: colors.ui.textMuted }}>
                You have already reviewed this booking. Only one review per booking is allowed.
              </Text>
            </View>
          ) : !isReviewable ? (
            <View
              className="flex-row gap-3 rounded-2xl px-4 py-3.5"
              style={{ backgroundColor: `${colors.primary['600']}08` }}>
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.primary['600']}
                style={{ marginTop: 1 }}
              />
              <Text className="flex-1 text-[13px] leading-5" style={{ color: colors.ui.textMuted }}>
                This booking can be reviewed once the job is marked complete.
              </Text>
            </View>
          ) : null}

          <Text
            className="mt-6 mb-3 text-center text-[15px] font-bold"
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

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </SafeAreaView>
  );
}
