import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../src/context/ThemeContext';
import { Button } from '../../../src/components/ui/Button';
import { Badge } from '../../../src/components/ui/Badge';
import { fetchReport } from '../../../src/services/reportService';
import { useBookingDetail } from '../../../src/hooks/useBookingDetail';
import { REPORT_STATUS_LABELS, REPORT_STATUS_VARIANTS } from '../../../src/constants/reports';
import type { UserReport } from '../../../src/types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [report, setReport] = useState<UserReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    fetchReport(id)
      .then((row) => {
        if (!cancelled) setReport(row);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { detail: booking } = useBookingDetail(report?.bookingId);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.ui.background }}
        className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary['600']} />
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.ui.background }}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={64} color={colors.ui.textLight} />
          <Text className="mt-4 text-[18px] font-bold" style={{ color: colors.ui.text }}>
            Report Not Found
          </Text>
          <Text className="mt-2 text-center text-[14px]" style={{ color: colors.ui.textMuted }}>
            This report could not be found.
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
            Report Details
          </Text>
          <Badge
            text={REPORT_STATUS_LABELS[report.status]}
            variant={REPORT_STATUS_VARIANTS[report.status]}
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}>
          <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.ui.surface }}>
            <Text className="text-[13px] font-semibold" style={{ color: colors.ui.textMuted }}>
              Reason
            </Text>
            <Text className="mt-1 text-[16px] font-bold" style={{ color: colors.ui.text }}>
              {report.reason}
            </Text>
            <View className="mt-3 flex-row gap-6">
              <View>
                <Text className="text-[11px] font-medium" style={{ color: colors.ui.textMuted }}>
                  Reported by
                </Text>
                <Text className="mt-0.5 text-[13px]" style={{ color: colors.ui.text }}>
                  {report.reporterName}
                </Text>
              </View>
              <View>
                <Text className="text-[11px] font-medium" style={{ color: colors.ui.textMuted }}>
                  Reported on
                </Text>
                <Text className="mt-0.5 text-[13px]" style={{ color: colors.ui.text }}>
                  {formatDate(report.createdAt)}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.ui.surface }}>
            <Text className="mb-2 text-[13px] font-semibold" style={{ color: colors.ui.textMuted }}>
              Description
            </Text>
            <Text className="text-[14px] leading-5" style={{ color: colors.ui.text }}>
              {report.description}
            </Text>
          </View>

          {booking && (
            <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.ui.surface }}>
              <Text
                className="mb-2 text-[13px] font-semibold"
                style={{ color: colors.ui.textMuted }}>
                Related Booking
              </Text>
              <Text className="text-[14px] font-bold" style={{ color: colors.ui.text }}>
                {booking.reference}
              </Text>
              <Text className="mt-0.5 text-[13px]" style={{ color: colors.ui.textMuted }}>
                {booking.serviceCategory} · {booking.location}
              </Text>
              <Text className="mt-0.5 text-[12px]" style={{ color: colors.ui.textMuted }}>
                ₱{booking.amount.toLocaleString()}
              </Text>
            </View>
          )}

          {report.status !== 'Pending' && (
            <View className="rounded-2xl p-4" style={{ backgroundColor: colors.ui.surface }}>
              <Text
                className="mb-2 text-[13px] font-semibold"
                style={{ color: colors.ui.textMuted }}>
                Last Updated
              </Text>
              <Text className="text-[14px]" style={{ color: colors.ui.text }}>
                Status changed to {REPORT_STATUS_LABELS[report.status]} on{' '}
                {formatDate(report.updatedAt)}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
