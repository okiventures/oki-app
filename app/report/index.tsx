import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Badge } from '../../src/components/ui/Badge';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { getReportsByUser } from '../../src/mocks/reports';
import { MOCK_CLIENT, MOCK_HANDYMAN } from '../../src/mocks';
import type { ReportStatus } from '../../src/types';

const STATUS_LABELS: Record<ReportStatus, string> = {
  Pending: 'Pending',
  Reviewed: 'Reviewed',
  Resolved: 'Resolved',
  Dismissed: 'Dismissed',
};

const STATUS_VARIANTS: Record<ReportStatus, 'warning' | 'status' | 'success' | 'error'> = {
  Pending: 'warning',
  Reviewed: 'status',
  Resolved: 'success',
  Dismissed: 'error',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { session } = useAuth();

  const viewerRole = session?.user?.userType ?? 'client';
  const currentUserId = viewerRole === 'client' ? MOCK_CLIENT.id : MOCK_HANDYMAN.id;
  const reports = getReportsByUser(currentUserId);

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
            My Reports
          </Text>
        </View>

        {reports.length === 0 ? (
          <View className="flex-1 justify-center">
            <EmptyState
              icon="document-text-outline"
              title="No Reports"
              message="You haven't submitted any reports yet."
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}>
            {reports.map((report) => (
              <View
                key={report.id}
                style={{
                  backgroundColor: colors.ui.surface,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                className="mb-3 rounded-2xl p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-[14px] font-bold" style={{ color: colors.ui.text }}>
                      {report.reason}
                    </Text>
                    <Text className="mt-1 text-[12px]" style={{ color: colors.ui.textMuted }}>
                      Reported {formatDate(report.createdAt)}
                    </Text>
                    <Text
                      className="mt-1.5 text-[13px] leading-5"
                      style={{ color: colors.ui.textLight }}
                      numberOfLines={2}>
                      {report.description}
                    </Text>
                  </View>
                  <Badge
                    text={STATUS_LABELS[report.status]}
                    variant={STATUS_VARIANTS[report.status]}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
