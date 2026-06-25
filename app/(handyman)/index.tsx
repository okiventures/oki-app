import React, { useState } from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_HANDYMAN } from '../../src/mocks';
import { formatCurrency } from '../../src/utils';
import { useBookings, ACTIVE_HANDYMAN_BOOKING_STATUSES } from '../../src/context/BookingsContext';
import { ActiveJobWorkflowCardOverview } from '../../src/components/handyman/ActiveJobWorkflowCard';

export default function HandymanDashboard() {
  const { colors } = useTheme();
  const [isActive, setIsActive] = useState(MOCK_HANDYMAN.isOnline);
  const { bookings } = useBookings();
  const myBookings = bookings.filter((booking) => booking.handymanId === MOCK_HANDYMAN.id);
  const activeJob = myBookings.filter((booking) =>
    ACTIVE_HANDYMAN_BOOKING_STATUSES.includes(booking.status)
  )[0];

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
              onValueChange={setIsActive}
              trackColor={{ true: colors.primary['600'] }}
            />
          </Card>

          {/* Earnings Overview */}
          <View className="flex-row gap-2">
            <Card className="flex-1 items-center py-3">
              <Ionicons name="wallet-outline" size={20} color="#6B7280" className="mb-2" />
              <Text className="mb-1 text-[11px] font-medium text-gray-500">Today</Text>
              <Text className="font-heading text-lg text-gray-900">{formatCurrency(120)}</Text>
            </Card>
            <Card className="flex-1 items-center py-3">
              <Ionicons name="stats-chart-outline" size={20} color="#6B7280" className="mb-2" />
              <Text className="mb-1 text-[11px] font-medium text-gray-500">This Week</Text>
              <Text className="font-heading text-lg text-gray-900">{formatCurrency(845)}</Text>
            </Card>
          </View>

          {/* Placeholder for Active Jobs */}
          <View>
            <Text className="font-heading mb-4 text-base text-gray-900">Active Jobs</Text>
            {activeJob ? (
              <ActiveJobWorkflowCardOverview booking={activeJob} onAdvance={() => {}} />
            ) : (
              <Text className="mt-1 text-[13px] text-gray-500">
                You have no active jobs at the moment.
              </Text>
            )}
          </View>

          {/* Upcoming Schedule Snippet */}
          <Text className="font-heading text-base text-gray-900">Next Job</Text>
          <Card>
            <Text className="text-[13px] font-semibold text-gray-800">Plumbing Fix</Text>
            <Text className="mt-1 text-[11px] text-gray-500">Today, 2:00 PM • 123 Main St</Text>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
