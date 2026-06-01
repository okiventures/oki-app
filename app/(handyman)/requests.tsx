import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import {
  ACTIVE_HANDYMAN_BOOKING_STATUSES,
  useBookings,
} from '../../src/context/BookingsContext';
import { Booking } from '../../src/types';
import { ActiveJobWorkflowCard } from '../../src/components/handyman/ActiveJobWorkflowCard';
import { RequestInboxCard } from '../../src/components/handyman/RequestInboxCard';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { EmptyState } from '../../src/components/ui/EmptyState';

const HANDYMAN_ID = 'h1';

type PendingAction = {
  booking: Booking;
  type: 'accept' | 'decline';
} | null;

export default function HandymanRequests() {
  const { bookings, acceptBooking, declineBooking, advanceBooking } = useBookings();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const myBookings = useMemo(
    () => bookings.filter((booking) => booking.handymanId === HANDYMAN_ID),
    [bookings],
  );

  const incomingRequests = myBookings
    .filter((booking) => booking.status === 'Pending')
    .sort(
      (left, right) =>
        new Date(left.requestExpiresAt ?? left.createdAt).getTime() -
        new Date(right.requestExpiresAt ?? right.createdAt).getTime(),
    );

  const activeJob = myBookings
    .filter((booking) => ACTIVE_HANDYMAN_BOOKING_STATUSES.includes(booking.status))
    .sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
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
    <View className="flex-1 bg-gray-50">
      <Navbar title="Incoming Requests" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="px-1 text-[13px] text-gray-500">
          Requests are now driven by the same booking records the client sees, so each action updates both sides of the prototype flow.
        </Text>

        {activeJob ? (
          <View className="mt-5">
            <ActiveJobWorkflowCard booking={activeJob} onAdvance={() => advanceBooking(activeJob.id)} />
          </View>
        ) : null}

        <View className="mb-3 mt-1 px-1">
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

      <ConfirmDialog
        visible={pendingAction !== null}
        title={pendingAction?.type === 'accept' ? 'Accept booking request?' : 'Decline booking request?'}
        message={
          pendingAction?.type === 'accept'
            ? 'This request will move to Accepted for both the handyman queue and the client booking list.'
            : 'This request will be marked as Cancelled in the shared booking list for this prototype flow.'
        }
        confirmLabel={pendingAction?.type === 'accept' ? 'Accept request' : 'Decline request'}
        cancelLabel="Keep reviewing"
        danger={pendingAction?.type === 'decline'}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </View>
  );
}
