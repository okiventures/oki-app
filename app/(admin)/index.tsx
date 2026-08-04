import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { Ionicons } from '@expo/vector-icons';
import { Chart } from '../../src/components/admin/Chart';
import { useAuth } from '../../src/context/AuthContext';
import { useAdmin } from '../../src/context/AdminContext';
import { useAdminDashboard } from '../../src/hooks/useAdminDashboard';
import { formatCurrency, formatDateTime } from '../../src/utils';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { pendingKycCount, activeUsersCount, activeDisputesCount, error: adminError } = useAdmin();
  const { metrics, transactions, activity, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Navbar title="Admin Panel" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </View>
    );
  }

  const pendingTransactions = transactions.filter((item) => item.status === 'Authorized');

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Admin Panel" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <ErrorBanner message={error ?? adminError} />

        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Ionicons name="people" size={20} color="#4F46E5" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Active Users</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">
              {activeUsersCount.toLocaleString()}
            </Text>
            <Text className="mt-1 text-[10px] font-bold text-green-600">
              {metrics?.activeUsersGrowth ?? '—'}
            </Text>
          </Card>
          <Card className="flex-1 p-3">
            <Ionicons name="cash" size={20} color="#10B981" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Revenue</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">
              {formatCurrency(metrics?.totalRevenue ?? 0)}
            </Text>
            <Text className="mt-1 text-[10px] font-bold text-green-600">
              {metrics?.revenueGrowth ?? '—'}
            </Text>
          </Card>
        </View>

        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Ionicons name="alert-circle" size={20} color="#EF4444" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Active Disputes</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">{activeDisputesCount}</Text>
            {activeDisputesCount > 0 && (
              <Text className="mt-1 text-[10px] font-bold text-red-600">Needs Attention</Text>
            )}
          </Card>
          <Card className="flex-1 p-3">
            <Ionicons name="document-text" size={20} color="#F59E0B" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Pending KYC</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">{pendingKycCount}</Text>
          </Card>
        </View>

        <Chart
          title="Bookings + Revenue (7 days)"
          labels={metrics?.chart.labels ?? []}
          xAxisLabel="Day"
          yAxisLabel="Count / PHP"
          series={[
            { name: 'Bookings', data: metrics?.chart.bookings ?? [], color: '#6366F1' },
            { name: 'Revenue', data: metrics?.chart.revenue ?? [], color: '#10B981' },
          ]}
        />

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[13px] font-bold text-gray-900">Pending Transactions</Text>
            <Text className="text-[11px] text-gray-500">Awaiting capture</Text>
          </View>
          {pendingTransactions.length === 0 ? (
            <Card className="p-3">
              <Text className="text-[13px] text-gray-500">Nothing awaiting capture.</Text>
            </Card>
          ) : (
            pendingTransactions.slice(0, 3).map((transaction) => (
              <Card key={transaction.id} className="mb-3 p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-gray-900">
                    {transaction.clientName} → {transaction.handymanName || 'Unassigned'}
                  </Text>
                  <Text className="text-[11px] text-gray-500">{transaction.paymentMethod}</Text>
                </View>
                <Text className="mb-2 text-[13px] text-gray-600">
                  Booking #OKI-{transaction.bookingId.slice(0, 8).toUpperCase()}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] text-gray-800">
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <Text className="text-[11px] text-gray-500">
                    {formatDateTime(transaction.createdAt)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>

        <View>
          <Text className="mb-3 text-[13px] font-bold text-gray-900">Recent Activity</Text>
          {activity.length === 0 ? (
            <Card className="p-3">
              <Text className="text-[13px] text-gray-500">No activity yet.</Text>
            </Card>
          ) : (
            activity.map((item) => (
              <Card key={item.id} className="mb-3 p-3">
                <Text className="mb-1 text-sm font-semibold text-gray-900">{item.title}</Text>
                <Text className="mb-2 text-[13px] text-gray-600">{item.description}</Text>
                <Text className="text-[11px] text-gray-500">{formatDateTime(item.createdAt)}</Text>
              </Card>
            ))
          )}
        </View>

        <View className="mt-2">
          <TouchableOpacity className="bg-primary-600 items-center rounded-2xl py-3">
            <Text className="text-sm font-bold text-white">View full analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View className="mt-4 mb-8">
          <TouchableOpacity
            onPress={() => logout()}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3.5">
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text className="font-semibold text-red-600">Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
