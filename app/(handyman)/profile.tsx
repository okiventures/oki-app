import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { useReviews } from '../../src/hooks/useReviews';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Avatar } from '../../src/components/ui/Avatar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Tabs } from '../../src/components/ui/Tabs';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { RatingDisplay } from '../../src/components/ui/RatingDisplay';
import { ReviewCard } from '../../src/components/cards/ReviewCard';
import { ReviewFlagModal } from '../../src/components/features/ReviewFlagModal';
import { flagReview } from '../../src/services/reviewService';
import { Review } from '../../src/types';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_HANDYMAN, MOCK_HANDYMAN_WALLET } from '../../src/mocks';
import { isMockEnv } from '../../src/services/bookingService';
import { Link, useRouter } from 'expo-router';
import { WalletSection } from '../../src/components/handyman/WalletSection';
import { ServicesManager } from '../../src/components/handyman/ServicesManager';
import { Modal } from '../../src/components/ui/Modal';
import { Button } from '../../src/components/ui/Button';

export default function HandymanProfile() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const { profile, services, serviceCatalog, addService, updateServicePrice, removeService } =
    useProfile();
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Reviews (Week 13): aggregate display + paginated, sortable list
  // Only fall back to the mock id when running against mock data — the real
  // backend uses UUID ids, and 'h1' would break the reviewee_id query.
  const profileUserId = profile?.user?.id ?? (isMockEnv() ? MOCK_HANDYMAN.id : undefined);
  const {
    reviews: profileReviews,
    isLoading: reviewsLoading,
    isLoadingMore: reviewsLoadingMore,
    error: reviewsError,
    hasMore: reviewsHasMore,
    sort: reviewsSort,
    setSort: setReviewsSort,
    loadMore: loadMoreReviews,
  } = useReviews(profileUserId);
  const [flagTarget, setFlagTarget] = useState<Review | null>(null);
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagSuccess, setFlagSuccess] = useState(false);

  // Use real profile data when available, fall back to mock for dev/testing
  const displayName = profile?.user?.full_name ?? MOCK_HANDYMAN.name;
  const displayPhoto = profile?.user?.photo_url ?? MOCK_HANDYMAN.photoUrl;
  const displayRating = profile?.handyman?.trust_score ?? MOCK_HANDYMAN.rating;
  const displayReviewCount = profile?.handyman?.review_count ?? MOCK_HANDYMAN.reviewCount;
  const displaySkills =
    services.length > 0
      ? Array.from(new Set(services.map((s) => s.service.category)))
      : MOCK_HANDYMAN.skills;
  const displayBio = profile?.handyman?.bio ?? MOCK_HANDYMAN.bio;
  const displayHourlyRate = profile?.handyman?.hourly_rate ?? MOCK_HANDYMAN.hourlyRate;
  const displayLocation = MOCK_HANDYMAN.location; // PostGIS location not parseable on client; use mock

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Logout handled by AuthContext even on error
    } finally {
      setIsLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  const handleSubmitFlag = async (reason: string) => {
    if (!flagTarget) return;
    setFlagSubmitting(true);
    setFlagError(null);
    setFlagSuccess(false);
    try {
      await flagReview(flagTarget.id, reason);
      setFlagSuccess(true);
      setFlagTarget(null);
    } catch (e) {
      setFlagError(e instanceof Error ? e.message : 'Failed to flag review');
    } finally {
      setFlagSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.primary['600'] }}>
        <ScreenHeader title="Worker Profile" />

        <View
          className="flex-1 rounded-t-[32px] px-4 pb-9"
          style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
          <View className="items-center" style={{ marginTop: -40 }}>
            <View
              className="rounded-full border-4 border-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 6,
              }}>
              <Avatar name={displayName} photoUrl={displayPhoto} size={80} />
            </View>
            <Text className="font-heading mt-3 text-lg text-gray-900">{displayName}</Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="star" size={14} color="#EAB308" />
              <Text className="text-[13px] font-bold text-gray-700">{displayRating}</Text>
              <Text className="text-[13px] text-gray-500">({displayReviewCount} reviews)</Text>
            </View>
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {displaySkills.map((skill) => (
                <Badge key={skill} text={skill} variant="primary" />
              ))}
            </View>

            {/* Bio + hourly rate + location from profile */}
            {displayBio ? (
              <Text className="mt-3 px-4 text-center text-[13px] leading-5 text-gray-500">
                {displayBio}
              </Text>
            ) : null}
            <View className="mt-2 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
              {displayHourlyRate > 0 ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="cash-outline" size={13} color={colors.primary['500']} />
                  <Text className="text-[13px] font-semibold text-gray-700">
                    ₱{displayHourlyRate}/hr
                  </Text>
                </View>
              ) : null}
              {displayLocation ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="location-outline" size={13} color={colors.primary['500']} />
                  <Text className="text-[13px] text-gray-600">{displayLocation}</Text>
                </View>
              ) : null}
            </View>

            {/* Edit Profile button */}
            <View className="mt-4">
              <Button
                label="Edit Profile"
                variant="tertiary"
                onPress={() => router.push('/profile/edit')}
                leftIcon={<Ionicons name="pencil" size={15} color={colors.primary['600']} />}
              />
            </View>
          </View>

          <View className="mt-6">
            <WalletSection wallet={MOCK_HANDYMAN_WALLET} />
          </View>

          <View className="mt-6">
            <ServicesManager
              services={services}
              catalog={serviceCatalog}
              onAdd={addService}
              onUpdatePrice={updateServicePrice}
              onRemove={removeService}
            />
          </View>

          {/* Reviews (Week 13) */}
          <View className="mt-6">
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className="font-heading text-lg text-gray-900">Reviews</Text>
              <RatingDisplay rating={displayRating} reviewCount={displayReviewCount} size="md" />
            </View>

            <Tabs<'Most Recent' | 'Top Rated'>
              tabs={['Most Recent', 'Top Rated']}
              activeTab={reviewsSort === 'rating' ? 'Top Rated' : 'Most Recent'}
              onChangeTab={(label) => setReviewsSort(label === 'Top Rated' ? 'rating' : 'recent')}
              containerStyle={{ marginBottom: 12 }}
            />

            {reviewsLoading ? (
              <View className="py-10">
                <LoadingSpinner label="Loading reviews…" />
              </View>
            ) : reviewsError ? (
              <Card className="items-center py-6">
                <Text className="text-[13px] text-gray-500">{reviewsError}</Text>
              </Card>
            ) : profileReviews.length === 0 ? (
              <Card className="py-6">
                <EmptyState
                  icon="star-outline"
                  title="No reviews yet"
                  message="Reviews from completed jobs will appear here."
                />
              </Card>
            ) : (
              <>
                <Card className="px-4 py-2">
                  {profileReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onFlag={(r) => {
                        setFlagError(null);
                        setFlagSuccess(false);
                        setFlagTarget(r);
                      }}
                    />
                  ))}
                  {reviewsLoadingMore ? (
                    <View className="py-3">
                      <LoadingSpinner size="small" />
                    </View>
                  ) : null}
                </Card>
                {reviewsHasMore && !reviewsLoadingMore ? (
                  <Pressable
                    accessibilityLabel="Load more reviews"
                    onPress={loadMoreReviews}
                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    className="mt-3 items-center rounded-2xl border border-gray-200 bg-white py-3">
                    <Text
                      className="text-[13px] font-semibold"
                      style={{ color: colors.primary['600'] }}>
                      Load more reviews
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          <Card className="mt-4 overflow-hidden p-0">
            <Link href="/(handyman)/past-jobs" asChild>
              <TouchableOpacity className="flex-row items-center border-b border-gray-100 p-4">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.primary['50'] }}>
                  <Ionicons name="albums-outline" size={18} color={colors.primary['600']} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-bold text-gray-900">Past Jobs</Text>
                  <Text className="mt-0.5 text-[11px] text-gray-500">Your Previous Jobs</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              className="flex-row items-center border-b border-gray-100 p-4"
              onPress={() => router.push('/report')}>
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primary['50'] }}>
                <Ionicons name="flag-outline" size={18} color={colors.primary['600']} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">My Reports</Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">
                  View your submitted reports
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center border-b border-gray-100 p-4"
              onPress={() => router.push('/profile/settings')}>
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primary['50'] }}>
                <Ionicons name="settings-outline" size={18} color={colors.primary['600']} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Settings</Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">
                  Password, theme, notifications
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center p-4">
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primary['50'] }}>
                <Ionicons name="help-buoy-outline" size={18} color={colors.primary['600']} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Help & Support</Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">Contact Oki Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>

          <View className="mx-5 mt-8 mb-3">
            <Pressable
              onPress={() => setLogoutModalVisible(true)}
              accessibilityLabel="Log out"
              android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3.5">
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text className="text-[14px] font-semibold text-red-500">Log Out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title="Log Out">
        <Text className="mb-4 text-sm" style={{ color: colors.ui.textMuted }}>
          Are you sure you want to log out? You&apos;ll need to sign in again to access your
          bookings.
        </Text>
        <View className="gap-2.5">
          <Button
            label="Log Out"
            variant="danger"
            fullWidth
            loading={isLoggingOut}
            onPress={handleLogout}
          />
          <Button
            label="Cancel"
            variant="tertiary"
            fullWidth
            onPress={() => setLogoutModalVisible(false)}
          />
        </View>
      </Modal>

      <ReviewFlagModal
        visible={flagTarget !== null}
        review={flagTarget}
        submitting={flagSubmitting}
        error={flagError}
        onClose={() => {
          setFlagTarget(null);
          setFlagError(null);
        }}
        onSubmit={handleSubmitFlag}
      />

      <Modal visible={flagSuccess} onClose={() => setFlagSuccess(false)} title="Review flagged">
        <Text className="mb-4 text-sm" style={{ color: colors.ui.textMuted }}>
          Thanks for keeping Oki safe. Our team will review this review shortly. It is hidden from
          public profiles while it is under review.
        </Text>
        <Button label="OK" variant="tertiary" fullWidth onPress={() => setFlagSuccess(false)} />
      </Modal>
    </SafeAreaView>
  );
}
