import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ACTIVE_HANDYMAN_BOOKING_STATUSES, useBookings } from '../../src/context/BookingsContext';
import { Booking } from '../../src/types';
import { ActiveJobWorkflowCard } from '../../src/components/handyman/ActiveJobWorkflowCard';
import { RequestInboxCard } from '../../src/components/handyman/RequestInboxCard';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/context/AuthContext';
import { isMockEnv } from '../../src/services/bookingService';

// Offline demo only: MOCK_BOOKINGS are keyed to this handyman, so the inbox
// still populates with no session. Against a live backend there is no fallback
// identity — bookings come from RLS + list_available_bookings() and an
// unauthenticated user must see nothing.
const DEMO_HANDYMAN_ID = 'h1';

type PendingAction = {
  booking: Booking;
  type: 'accept' | 'decline';
} | null;

export default function HandymanRequests() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { bookings, acceptBooking, declineBooking, advanceBooking } = useBookings();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const handymanId = session?.user?.id ?? (isMockEnv() ? DEMO_HANDYMAN_ID : '');

  const myBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.handymanId === handymanId ||
          (booking.handymanId === '' && booking.status === 'Pending')
      ),
    [bookings, handymanId]
  );

  const incomingRequests = myBookings
    .filter((booking) => booking.status === 'Pending')
    .sort(
      (left, right) =>
        new Date(left.requestExpiresAt ?? left.createdAt).getTime() -
        new Date(right.requestExpiresAt ?? right.createdAt).getTime()
    );

  const activeJob = myBookings
    .filter((booking) => ACTIVE_HANDYMAN_BOOKING_STATUSES.includes(booking.status))
    .sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )[0];

  const requestCountLabel =
    incomingRequests.length === 1
      ? '1 new booking is waiting for your response.'
      : `${incomingRequests.length} new bookings are waiting for your response.`;

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === 'accept') {
      acceptBooking(pendingAction.booking.id);
    } else {
      declineBooking(pendingAction.booking.id);
    }

    setPendingAction(null);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Incoming Requests" />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="mt-5 flex-1 rounded-xl"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          {activeJob ? (
            <View className="mb-4">
              <ActiveJobWorkflowCard
                booking={activeJob}
                onAdvance={() => advanceBooking(activeJob.id)}
                onViewDetails={() => router.push(`/job/${activeJob.id}`)}
              />
            </View>
          ) : null}

          <View className="mt-1 mb-3 px-1">
            <Text className="text-[18px] font-bold text-gray-900">Request Inbox</Text>
            <Text className="mt-1 text-[13px] text-gray-500">{requestCountLabel}</Text>
          </View>

          {incomingRequests.length > 0 ? (
            incomingRequests.map((booking) => (
              <RequestInboxCard
                key={booking.id}
                booking={booking}
                onAccept={() => setPendingAction({ booking, type: 'accept' })}
                onDecline={() => setPendingAction({ booking, type: 'decline' })}
                onViewDetails={() => router.push(`/job/${booking.id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon="mail-open-outline"
              title="No pending requests"
              message="New booking matches will appear here when a client request is routed to you."
            />
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={pendingAction !== null}
        title={
          pendingAction?.type === 'accept' ? 'Accept booking request?' : 'Decline booking request?'
        }
        message={
          pendingAction?.type === 'accept'
            ? 'This request will move to Accepted for both the handyman queue and the client booking list.'
            : 'This request will be marked as Rejected and removed from your inbox. The client is notified so it can be re-offered.'
        }
        confirmLabel={pendingAction?.type === 'accept' ? 'Accept request' : 'Decline request'}
        cancelLabel="Keep reviewing"
        danger={pendingAction?.type === 'decline'}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </SafeAreaView>
  );
}
