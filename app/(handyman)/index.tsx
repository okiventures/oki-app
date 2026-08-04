import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Switch, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { getOnlineStatus, updateOnlineStatus } from '../../src/services/profileService';
import { isMockEnv } from '../../src/services/bookingService';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../../src/services/locationService';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { useEarnings } from '../../src/hooks/useEarnings';
import {
  MOCK_HANDYMAN,
  filterEarningsByRange,
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  getLastMonthRange,
  getRangeLabel,
} from '../../src/mocks';
import { useBookings, ACTIVE_HANDYMAN_BOOKING_STATUSES } from '../../src/context/BookingsContext';
import { ActiveJobWorkflowCardOverview } from '../../src/components/handyman/ActiveJobWorkflowCard';
import { EarningsSummaryCard } from '../../src/components/handyman/EarningsSummaryCard';
import { Preset } from '../../src/components/handyman/EarningsDateRangeFilter';
import { formatDateTime } from '../../src/utils';

const PRESET_RANGES: Record<string, () => { start: Date; end: Date }> = {
  'This Day': getTodayRange,
  'This Week': getThisWeekRange,
  'This Month': getThisMonthRange,
  'Last Month': getLastMonthRange,
};

export default function HandymanDashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  // Assume offline until getOnlineStatus reports otherwise — showing "online"
  // optimistically misrepresents whether the accept guard will let jobs through.
  const [isActive, setIsActive] = useState(isMockEnv() ? MOCK_HANDYMAN.isOnline : false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const { bookings } = useBookings();
  const { earnings } = useEarnings();

  const handymanId = session?.user.id;

  useEffect(() => {
    if (!handymanId) return;
    let cancelled = false;
    getOnlineStatus(handymanId)
      .then((online) => {
        if (!cancelled && online !== null) setIsActive(online);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [handymanId]);

  const handleToggleStatus = async (next: boolean) => {
    const previous = isActive;
    setIsActive(next);
    setIsTogglingStatus(true);

    try {
      await updateOnlineStatus(next);
    } catch {
      setIsActive(previous);
      setIsTogglingStatus(false);
      return;
    }

    // Dispatch filters on handyman_locations, so tracking has to follow the
    // toggle or going online never puts the handyman on the map. A refused
    // permission must not flip the switch back: the status write already
    // landed and they are online, just without proximity filtering.
    if (!isMockEnv()) {
      try {
        await (next ? startBackgroundTracking() : stopBackgroundTracking());
      } catch (err) {
        console.error('Location tracking toggle failed:', err);
      }
    }

    setIsTogglingStatus(false);
  };

  const [selectedPreset, setSelectedPreset] = useState<Preset>('This Week');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const range = useMemo(() => {
    if (selectedPreset === 'Custom') {
      return { start: customStart, end: customEnd };
    }
    const fn = PRESET_RANGES[selectedPreset];
    return fn ? fn() : getThisWeekRange();
  }, [selectedPreset, customStart, customEnd]);

  const filteredTotal = useMemo(
    () =>
      filterEarningsByRange(earnings, range.start, range.end).reduce(
        (sum: number, e: { netEarnings: number }) => sum + e.netEarnings,
        0
      ),
    [earnings, range.start, range.end]
  );

  const rangeLabel = useMemo(
    () => getRangeLabel(selectedPreset, range.start, range.end),
    [selectedPreset, range]
  );

  // Offline demo only: MOCK_BOOKINGS are keyed to the demo handyman. With a
  // session this must filter on the signed-in id, or the dashboard shows an
  // empty active job no matter how many jobs the handyman actually has.
  const activeHandymanId = handymanId ?? (isMockEnv() ? MOCK_HANDYMAN.id : '');
  const myBookings = bookings.filter((booking) => booking.handymanId === activeHandymanId);
  const activeJob = myBookings.filter((booking) =>
    ACTIVE_HANDYMAN_BOOKING_STATUSES.includes(booking.status)
  )[0];

  const nextJob = useMemo(() => {
    const now = Date.now();
    return myBookings
      .filter(
        (booking) =>
          booking.id !== activeJob?.id &&
          booking.scheduledAt !== undefined &&
          new Date(booking.scheduledAt).getTime() > now &&
          ACTIVE_HANDYMAN_BOOKING_STATUSES.includes(booking.status)
      )
      .sort(
        (left, right) =>
          new Date(left.scheduledAt as string).getTime() -
          new Date(right.scheduledAt as string).getTime()
      )[0];
  }, [myBookings, activeJob?.id]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Dashboard" />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="mt-5 flex-1 rounded-xl"
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          {/* Active Status Toggle */}
          <Card className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Ionicons
                  name={isActive ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isActive ? '#15803D' : '#6B7280'}
                />
              </View>
              <View>
                <Text className="text-[15px] font-bold text-gray-900">
                  {isActive ? 'Accepting Requests' : 'Offline'}
                </Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">
                  {isActive ? 'You are visible to clients.' : 'Go online to get jobs.'}
                </Text>
              </View>
            </View>
            <Switch
              value={isActive}
              onValueChange={handleToggleStatus}
              disabled={isTogglingStatus}
              trackColor={{ true: colors.primary['600'] }}
            />
          </Card>

          {/* Active Jobs */}
          <View>
            <Text className="font-heading mb-4 text-base text-gray-900">Active Jobs</Text>
            {activeJob ? (
              <ActiveJobWorkflowCardOverview booking={activeJob} />
            ) : (
              <Text className="mt-1 text-[13px] text-gray-500">
                You have no active jobs at the moment.
              </Text>
            )}
          </View>

          {/* Upcoming Schedule Snippet */}
          <View>
            <Text className="font-heading mb-4 text-base text-gray-900">Next Job</Text>
            {nextJob ? (
              <Pressable onPress={() => router.push(`/job/${nextJob.id}`)}>
                <Card>
                  <Text className="text-[13px] font-semibold text-gray-800">
                    {nextJob.serviceCategory}
                  </Text>
                  <Text className="mt-1 text-[11px] text-gray-500">
                    {formatDateTime(nextJob.scheduledAt as string)}
                    {nextJob.location ? ` • ${nextJob.location}` : ''}
                  </Text>
                </Card>
              </Pressable>
            ) : (
              <Text className="mt-1 text-[13px] text-gray-500">
                You have no upcoming scheduled jobs.
              </Text>
            )}
          </View>

          {/* Earnings Overview */}
          <EarningsSummaryCard
            totalEarnings={filteredTotal}
            rangeLabel={rangeLabel}
            selectedPreset={selectedPreset}
            onPresetChange={setSelectedPreset}
            customStartDate={customStart}
            customEndDate={customEnd}
            rangeStart={range.start}
            rangeEnd={range.end}
            onCustomDateChange={(s, e) => {
              setCustomStart(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
              setCustomEnd(new Date(e.getFullYear(), e.getMonth(), e.getDate()));
              setSelectedPreset('Custom');
            }}
            onSeeFullReport={() => router.push('/(handyman)/earnings')}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
