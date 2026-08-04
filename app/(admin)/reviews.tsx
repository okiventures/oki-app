import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Tabs } from '../../src/components/ui/Tabs';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { RatingDisplay } from '../../src/components/ui/RatingDisplay';
import { Avatar } from '../../src/components/ui/Avatar';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../src/context/AdminContext';
import { formatRelativeTime } from '../../src/utils';
import type { FlaggedReviewRow } from '../../src/services/reviewService';

type FlagStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export default function AdminReviews() {
  const { flaggedReviews, flagStatus, setFlagStatus, loadingFlags, flagsError, resolveFlag } =
    useAdmin();

  const [pendingAction, setPendingAction] = useState<{
    flag: FlaggedReviewRow;
    action: 'RESOLVE' | 'DISMISS';
  } | null>(null);
  const [acting, setActing] = useState(false);

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setActing(true);
    try {
      await resolveFlag(pendingAction.flag.id, pendingAction.action);
      setPendingAction(null);
    } catch {
      // Surface via the toast-less error state; keep dialog open so admin can retry
    } finally {
      setActing(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Review Moderation" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Tabs<'PENDING' | 'RESOLVED' | 'DISMISSED'>
          tabs={['PENDING', 'RESOLVED', 'DISMISSED']}
          activeTab={flagStatus}
          onChangeTab={(tab) => setFlagStatus(tab as FlagStatus)}
        />

        {loadingFlags ? (
          <View className="py-16">
            <LoadingSpinner label="Loading flagged reviews…" />
          </View>
        ) : flagsError ? (
          <Card className="items-center py-8">
            <Text className="text-[13px] text-red-500">{flagsError}</Text>
          </Card>
        ) : flaggedReviews.length === 0 ? (
          <Card className="py-8">
            <EmptyState
              icon="flag-outline"
              title={`No ${flagStatus.toLowerCase()} flags`}
              message="Flagged reviews will appear here with the flag reason and original content."
            />
          </Card>
        ) : (
          flaggedReviews.map((flag) => {
            const review = flag.review;
            return (
              <Card key={flag.id} className="p-4">
                {/* Original review content */}
                <View className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <View className="mb-1.5 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Avatar
                        name={review?.reviewerName ?? 'Reviewer'}
                        photoUrl={review?.reviewerPhotoUrl}
                        size={28}
                      />
                      <Text className="ml-2 text-[13px] font-semibold text-gray-900">
                        {review?.reviewerName ?? 'Unknown reviewer'}
                      </Text>
                    </View>
                    <RatingDisplay rating={review?.rating ?? 0} showCount={false} size="sm" />
                  </View>
                  {review?.comment ? (
                    <Text className="text-[13px] leading-5 text-gray-700">{review.comment}</Text>
                  ) : (
                    <Text className="text-[12px] text-gray-400 italic">No comment</Text>
                  )}
                  {review?.createdAt ? (
                    <Text className="mt-1.5 text-[11px] text-gray-400">
                      {formatRelativeTime(review.createdAt)}
                    </Text>
                  ) : null}
                </View>

                {/* Flag details */}
                <View className="mb-3 flex-row items-start gap-2">
                  <Ionicons name="flag" size={15} color="#EF4444" style={{ marginTop: 2 }} />
                  <View className="flex-1">
                    <Text className="text-[12px] font-semibold text-red-500">
                      Flagged for: {flag.reason}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-gray-400">
                      By {flag.flaggerName ?? 'a user'} · {formatRelativeTime(flag.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Admin actions */}
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityLabel="Dismiss flag"
                    onPress={() => setPendingAction({ flag, action: 'DISMISS' })}
                    android_ripple={{ color: 'rgba(239,68,68,0.12)' }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                    className="flex-1 items-center rounded-full border border-red-200 bg-red-50 px-3 py-2.5">
                    <Text className="text-center text-[12px] font-semibold text-red-500">
                      Dismiss flag
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Uphold flag"
                    onPress={() => setPendingAction({ flag, action: 'RESOLVE' })}
                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                    className="flex-1 items-center rounded-full border border-gray-200 bg-white px-3 py-2.5">
                    <Text className="text-center text-[12px] font-semibold text-gray-700">
                      Uphold (keep hidden)
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}

        <ConfirmDialog
          visible={pendingAction !== null}
          title={pendingAction?.action === 'DISMISS' ? 'Dismiss flag' : 'Uphold flag'}
          message={
            pendingAction?.action === 'DISMISS'
              ? 'Dismiss this flag and make the review visible on the public profile again? This only happens if no other pending flags exist for the review.'
              : 'Uphold this flag and keep the review hidden from public profiles?'
          }
          confirmLabel={pendingAction?.action === 'DISMISS' ? 'Dismiss' : 'Uphold'}
          danger={pendingAction?.action === 'DISMISS'}
          loading={acting}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      </ScrollView>
    </View>
  );
}
