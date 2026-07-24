import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { Badge } from '../src/components/ui/Badge';
import { BookingStatus, BookingEvent } from '../src/types';
import { transitionBookingState, GUARD_DESCRIPTIONS } from '../src/services/bookingService';
import type { BookingAction } from '../src/services/bookingFsm';
import { MOCK_BOOKINGS } from '../src/mocks';
import { formatDateTime } from '../src/utils';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '../src/constants/theme';

// ─── FSM flow ─────────────────────────────────────────────────────────────────

const FSM_FLOW: { status: BookingStatus; nextAction: string | null; actor?: string }[] = [
  { status: BookingStatus.Pending, nextAction: 'ACCEPT', actor: 'handyman' },
  { status: BookingStatus.Accepted, nextAction: 'START_TRANSIT', actor: 'handyman' },
  { status: BookingStatus.InTransit, nextAction: 'MARK_ARRIVED', actor: 'handyman' },
  { status: BookingStatus.Arrived, nextAction: 'START_WORK', actor: 'handyman' },
  { status: BookingStatus.WorkStarted, nextAction: 'COMPLETE', actor: 'handyman' },
  { status: BookingStatus.Completed, nextAction: 'CAPTURE_PAYMENT', actor: 'system' },
  { status: BookingStatus.Paid, nextAction: null, actor: undefined },
];

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  [BookingStatus.Pending]: 'time-outline',
  [BookingStatus.Accepted]: 'checkmark-circle-outline',
  [BookingStatus.InTransit]: 'navigate-outline',
  [BookingStatus.Arrived]: 'location-outline',
  [BookingStatus.WorkStarted]: 'construct-outline',
  [BookingStatus.Completed]: 'checkmark-done-circle-outline',
  [BookingStatus.Paid]: 'wallet-outline',
  [BookingStatus.Cancelled]: 'close-circle-outline',
};

const ACTION_LABELS: Record<string, string> = {
  ACCEPT: 'Accept Booking',
  REJECT: 'Reject Booking',
  CANCEL: 'Cancel Booking',
  START_TRANSIT: 'Head to Job',
  MARK_ARRIVED: 'Mark Arrived',
  START_WORK: 'Start Work',
  COMPLETE: 'Complete Job',
  CAPTURE_PAYMENT: 'Capture Payment (System)',
};

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusNode({
  status,
  isActive,
  isCompleted,
  isCancelled,
  isLast,
}: {
  status: BookingStatus;
  isActive: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isLast: boolean;
}) {
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  const color = BOOKING_STATUS_COLORS[status] ?? '#6B7280';
  const iconName = STATUS_ICONS[status] ?? 'ellipse-outline';

  const bgColor = isCancelled
    ? '#FEE2E2'
    : isActive
      ? `${color}20`
      : isCompleted
        ? '#D1FAE5'
        : '#F3F4F6';
  const fgColor = isCancelled ? '#EF4444' : isActive ? color : isCompleted ? '#10B981' : '#9CA3AF';
  const borderColor = isCancelled ? '#EF4444' : isActive ? color : 'transparent';

  return (
    <View className="flex-row items-start">
      <View className="items-center" style={{ width: 40 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: isActive || isCancelled ? 2 : 0,
            borderColor,
          }}>
          <Ionicons name={iconName as any} size={17} color={fgColor} />
        </View>
        {!isLast && (
          <View
            style={{
              flex: 1,
              width: 2,
              marginTop: 4,
              marginBottom: 4,
              backgroundColor: isCompleted ? '#10B981' : '#E5E7EB',
            }}
          />
        )}
      </View>

      <View className="ml-3 flex-1 pb-6">
        <View className="flex-row items-center gap-2">
          <Text
            className={`text-[14px] font-semibold ${
              isActive || isCancelled ? '' : isCompleted ? '' : 'text-gray-400'
            }`}
            style={{
              color: isCancelled
                ? '#EF4444'
                : isActive
                  ? color
                  : isCompleted
                    ? '#1F2937'
                    : '#9CA3AF',
            }}>
            {label}
          </Text>
          {isActive && (
            <View className="rounded-full bg-blue-50 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-blue-600">CURRENT</Text>
            </View>
          )}
          {isCompleted && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
        </View>
        <Text className="mt-0.5 text-[11px] leading-4 text-gray-500">
          {isCancelled
            ? 'Booking cancelled by client.'
            : isActive
              ? 'Waiting for next transition…'
              : isCompleted
                ? 'Completed successfully.'
                : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LifecycleDemoScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const demoBooking = useMemo(
    () => MOCK_BOOKINGS.find((b) => b.id === 'b3') ?? MOCK_BOOKINGS[0],
    []
  );
  const [currentStatus, setCurrentStatus] = useState<BookingStatus>(BookingStatus.Pending);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState<'happy' | 'cancelled'>('happy');

  // Current index in the FSM flow
  const currentIdx = FSM_FLOW.findIndex((s) => s.status === currentStatus);
  const currentFlowNode = FSM_FLOW[currentIdx];
  const nextAction = currentFlowNode?.nextAction;
  const isTerminal =
    currentStatus === BookingStatus.Paid || currentStatus === BookingStatus.Cancelled;

  // Generate events locally for demo
  useEffect(() => {
    const newEvents: BookingEvent[] = [];

    if (demoMode === 'cancelled') {
      // Cancellation path: only PENDING → CANCELLED
      newEvents.push({
        id: 'evt-0',
        bookingId: demoBooking.id,
        actorId: demoBooking.clientId,
        fromStatus: undefined,
        toStatus: BookingStatus.Pending,
        metadata: { action: 'CREATE' },
        createdAt: new Date(Date.now() - 4000).toISOString(),
      });
      if (currentStatus === BookingStatus.Cancelled) {
        newEvents.push({
          id: 'evt-1',
          bookingId: demoBooking.id,
          actorId: demoBooking.clientId,
          fromStatus: BookingStatus.Pending,
          toStatus: BookingStatus.Cancelled,
          metadata: { action: 'CANCEL', reason: 'Client request' },
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      // Happy path: walk through FSM_FLOW up to current status
      for (let i = 0; i < FSM_FLOW.length; i++) {
        const node = FSM_FLOW[i];
        const nodeIdx = FSM_FLOW.findIndex((s) => s.status === currentStatus);
        if (i > nodeIdx) break;
        const actorId =
          node.actor === 'system'
            ? 'SYSTEM'
            : i > 0
              ? demoBooking.handymanId
              : demoBooking.clientId;
        newEvents.push({
          id: `evt-${i}`,
          bookingId: demoBooking.id,
          actorId,
          fromStatus: i > 0 ? FSM_FLOW[i - 1].status : undefined,
          toStatus: node.status,
          metadata: node.nextAction ? { action: node.nextAction } : {},
          createdAt: new Date(Date.now() - (FSM_FLOW.length - i) * 2000).toISOString(),
        });
      }
    }
    setEvents(newEvents);
  }, [currentStatus, demoBooking.clientId, demoBooking.handymanId, demoBooking.id, demoMode]);

  const handleAdvance = useCallback(async () => {
    if (!nextAction || isTransitioning) return;
    setIsTransitioning(true);
    setError(null);

    try {
      const transitionMap: Record<string, BookingStatus> = {
        ACCEPT: BookingStatus.Accepted,
        START_TRANSIT: BookingStatus.InTransit,
        MARK_ARRIVED: BookingStatus.Arrived,
        START_WORK: BookingStatus.WorkStarted,
        COMPLETE: BookingStatus.Completed,
        CAPTURE_PAYMENT: BookingStatus.Paid,
      };

      const targetStatus = transitionMap[nextAction];

      await transitionBookingState(demoBooking.id, nextAction as any, { simulated: true });
      if (targetStatus) {
        setCurrentStatus(targetStatus);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transition failed');
    } finally {
      setIsTransitioning(false);
    }
  }, [nextAction, isTransitioning, demoBooking.id]);

  const handleCancel = useCallback(async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setError(null);

    try {
      await transitionBookingState(demoBooking.id, 'CANCEL', { simulated: true });
      setCurrentStatus(BookingStatus.Cancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setIsTransitioning(false);
    }
  }, [isTransitioning, demoBooking.id]);

  const handleReset = useCallback(() => {
    setCurrentStatus(BookingStatus.Pending);
    setEvents([]);
    setError(null);
  }, []);

  const guardText = nextAction
    ? (GUARD_DESCRIPTIONS[nextAction as BookingAction] ?? 'No guard conditions documented')
    : null;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="p-1">
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.95)" />
        </Pressable>
        <Text className="text-[17px] font-semibold text-white">Booking Lifecycle Demo</Text>
        <View style={{ width: 32 }} />
      </View>

      <View className="flex-1 rounded-t-[32px]" style={{ backgroundColor: colors.ui.background }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          {/* Mode selector */}
          <View className="mb-5 flex-row gap-2">
            <Pressable
              onPress={() => {
                handleReset();
                setDemoMode('happy');
              }}
              className={`flex-1 rounded-xl py-3 ${demoMode === 'happy' ? 'bg-blue-500' : 'bg-gray-100'}`}>
              <Text
                className={`text-center text-[13px] font-semibold ${demoMode === 'happy' ? 'text-white' : 'text-gray-600'}`}>
                Happy Path
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                handleReset();
                setDemoMode('cancelled');
              }}
              className={`flex-1 rounded-xl py-3 ${demoMode === 'cancelled' ? 'bg-red-500' : 'bg-gray-100'}`}>
              <Text
                className={`text-center text-[13px] font-semibold ${demoMode === 'cancelled' ? 'text-white' : 'text-gray-600'}`}>
                Cancellation
              </Text>
            </Pressable>
          </View>

          {/* Booking info card */}
          <Card className="mb-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-bold tracking-[1px] text-gray-500 uppercase">
                  Demo Booking
                </Text>
                <Text className="mt-1 text-[18px] font-bold text-gray-900">
                  {demoBooking.serviceCategory}
                </Text>
                <Text className="mt-0.5 text-[13px] text-gray-500">
                  {demoBooking.description.slice(0, 60)}…
                </Text>
              </View>
              <Badge
                variant={
                  currentStatus === BookingStatus.Paid
                    ? 'success'
                    : currentStatus === BookingStatus.Cancelled
                      ? 'error'
                      : 'primary'
                }
                text={BOOKING_STATUS_LABELS[currentStatus] ?? currentStatus}
              />
            </View>
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1 rounded-xl bg-gray-50 px-3 py-2">
                <Text className="text-[10px] text-gray-500">Amount</Text>
                <Text className="text-[15px] font-bold text-gray-900">
                  ₱{demoBooking.amount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 rounded-xl bg-gray-50 px-3 py-2">
                <Text className="text-[10px] text-gray-500">Net Payout</Text>
                <Text className="text-[15px] font-bold text-gray-900">
                  ₱{demoBooking.netAmount.toFixed(2)}
                </Text>
              </View>
              <View className="flex-1 rounded-xl bg-gray-50 px-3 py-2">
                <Text className="text-[10px] text-gray-500">Fee</Text>
                <Text className="text-[15px] font-bold text-gray-900">
                  ₱{demoBooking.platformFee.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>

          {/* State Machine Flow Diagram */}
          <View className="mb-4">
            <Text className="mb-3 text-[16px] font-bold text-gray-900">
              <Ionicons name="git-branch-outline" size={16} /> State Machine
            </Text>
            <Card>
              <View className="py-2">
                {demoMode === 'happy' ? (
                  FSM_FLOW.map((node, idx) => (
                    <StatusNode
                      key={node.status}
                      status={node.status}
                      isActive={node.status === currentStatus && !isTerminal}
                      isCompleted={
                        FSM_FLOW.findIndex((s) => s.status === currentStatus) > idx && !isTerminal
                      }
                      isCancelled={false}
                      isLast={idx === FSM_FLOW.length - 1}
                    />
                  ))
                ) : (
                  <>
                    <StatusNode
                      status={BookingStatus.Pending}
                      isActive={currentStatus === BookingStatus.Pending}
                      isCompleted={currentStatus === BookingStatus.Cancelled}
                      isCancelled={false}
                      isLast={false}
                    />
                    <StatusNode
                      status={BookingStatus.Cancelled}
                      isActive={currentStatus === BookingStatus.Cancelled}
                      isCompleted={false}
                      isCancelled={true}
                      isLast={true}
                    />
                  </>
                )}
              </View>
            </Card>
          </View>

          {/* Controls */}
          <Card className="mb-5">
            <Text className="mb-3 text-[14px] font-bold text-gray-900">Controls</Text>

            {error && (
              <View className="mb-3 rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-[12px] text-red-700">{error}</Text>
              </View>
            )}

            {isTerminal ? (
              <View className="items-center py-4">
                <Ionicons
                  name={
                    currentStatus === BookingStatus.Paid ? 'checkmark-done-circle' : 'close-circle'
                  }
                  size={40}
                  color={currentStatus === BookingStatus.Paid ? '#10B981' : '#EF4444'}
                />
                <Text
                  className={`mt-2 text-[16px] font-bold ${
                    currentStatus === BookingStatus.Paid ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {currentStatus === BookingStatus.Paid
                    ? 'Booking Complete — Terminal State'
                    : 'Booking Cancelled — Terminal State'}
                </Text>
                <Button
                  label="Reset Demo"
                  variant="secondary"
                  onPress={handleReset}
                  style={{ marginTop: 16 }}
                />
              </View>
            ) : (
              <View>
                {demoMode === 'happy' && nextAction && (
                  <View className="mb-3 rounded-xl bg-amber-50 px-4 py-3">
                    <Text className="text-[11px] font-bold tracking-[0.5px] text-amber-700 uppercase">
                      Next Action
                    </Text>
                    <Text className="mt-0.5 text-[15px] font-bold text-amber-900">
                      {ACTION_LABELS[nextAction] ?? nextAction}
                    </Text>
                    {guardText && (
                      <>
                        <Text className="mt-2 text-[10px] font-bold tracking-[0.5px] text-amber-600 uppercase">
                          Guard Conditions
                        </Text>
                        <Text className="mt-0.5 text-[11px] leading-4 text-amber-800">
                          {guardText}
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {demoMode === 'happy' ? (
                  <View className="flex-row gap-2">
                    <Button
                      label={
                        nextAction
                          ? (ACTION_LABELS[nextAction] ?? 'Advance')
                          : 'No Action Available'
                      }
                      onPress={handleAdvance}
                      disabled={!nextAction || isTransitioning}
                      loading={isTransitioning}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    <Button
                      label={
                        BookingStatus.Cancelled === (currentStatus as BookingStatus)
                          ? 'Cancelled'
                          : 'Cancel Booking'
                      }
                      variant="danger"
                      onPress={handleCancel}
                      disabled={
                        isTransitioning ||
                        BookingStatus.Cancelled === (currentStatus as BookingStatus)
                      }
                      loading={isTransitioning}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* Audit Trail */}
          <Card>
            <Text className="mb-3 text-[14px] font-bold text-gray-900">
              <Ionicons name="list-outline" size={16} /> Audit Trail (booking_events)
            </Text>

            {events.length === 0 ? (
              <Text className="py-4 text-center text-[13px] text-gray-400">
                No events yet. Advance the state to see audit entries.
              </Text>
            ) : (
              events.map((event) => {
                const color = BOOKING_STATUS_COLORS[event.toStatus] ?? '#6B7280';
                return (
                  <View key={event.id} className="border-b border-gray-50 py-3 last:border-b-0">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="rounded-full px-2 py-0.5"
                          style={{ backgroundColor: `${color}18` }}>
                          <Text className="text-[10px] font-semibold" style={{ color }}>
                            {BOOKING_STATUS_LABELS[event.toStatus] ?? event.toStatus}
                          </Text>
                        </View>
                        {event.fromStatus && (
                          <>
                            <Ionicons name="arrow-forward" size={12} color="#9CA3AF" />
                            <View
                              className="rounded-full px-2 py-0.5"
                              style={{
                                backgroundColor: `${BOOKING_STATUS_COLORS[event.fromStatus] ?? '#6B7280'}18`,
                              }}>
                              <Text
                                className="text-[10px] font-semibold"
                                style={{
                                  color: BOOKING_STATUS_COLORS[event.fromStatus] ?? '#6B7280',
                                }}>
                                {BOOKING_STATUS_LABELS[event.fromStatus] ?? event.fromStatus}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                      <Text className="text-[10px] text-gray-400">
                        {formatDateTime(event.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          {/* Info */}
          <Card className="mt-5">
            <Text className="mb-2 text-[14px] font-bold text-gray-900">How to Test</Text>
            <View className="gap-2">
              <InfoRow
                icon="phone-portrait-outline"
                text="Open this screen on a device or emulator"
              />
              <InfoRow
                icon="arrow-forward-circle-outline"
                text="Tap Advance to walk through each state transition"
              />
              <InfoRow icon="eye-outline" text="Watch the audit trail populate in real-time" />
              <InfoRow
                icon="git-compare-outline"
                text="Switch to Cancellation mode to test the side exit"
              />
              <InfoRow
                icon="server-outline"
                text="When SUPABASE_URL is configured, connects to real Edge Functions"
              />
            </View>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon as any} size={14} color="#6B7280" />
      <Text className="flex-1 text-[12px] leading-4 text-gray-600">{text}</Text>
    </View>
  );
}
