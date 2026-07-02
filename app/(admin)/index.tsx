import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { Chart } from '../../src/components/admin/Chart';
import {
  MOCK_ADMIN_STATS,
  MOCK_ADMIN_CHART_DATA,
  MOCK_ADMIN_FEED,
  MOCK_TRANSACTIONS,
} from '../../src/mocks';
import { useAuth } from '../../src/context/AuthContext';
import { useAdmin } from '../../src/context/AdminContext';
import { formatCurrency, formatDateTime } from '../../src/utils';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { pendingKycCount, activeUsersCount, activeDisputesCount } = useAdmin();

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Admin Panel" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Ionicons name="people" size={20} color="#4F46E5" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Active Users</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">
              {MOCK_ADMIN_STATS.activeUsers.toLocaleString()}
            </Text>
            <Text className="mt-1 text-[10px] font-bold text-green-600">
              {MOCK_ADMIN_STATS.activeUsersGrowth}
            </Text>
          </Card>
          <Card className="flex-1 p-3">
            <Ionicons name="cash" size={20} color="#10B981" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Revenue</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">
              {formatCurrency(MOCK_ADMIN_STATS.totalRevenue)}
            </Text>
            <Text className="mt-1 text-[10px] font-bold text-green-600">
              {MOCK_ADMIN_STATS.revenueGrowth}
            </Text>
          </Card>
        </View>

        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Ionicons name="alert-circle" size={20} color="#EF4444" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Active Disputes</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">
              {MOCK_ADMIN_STATS.activeDisputes}
            </Text>
            <Text className="mt-1 text-[10px] font-bold text-red-600">Needs Attention</Text>
          </Card>
          <Card className="flex-1 p-3">
            <Ionicons name="document-text" size={20} color="#F59E0B" className="mb-2" />
            <Text className="text-[11px] font-medium text-gray-500">Pending KYC</Text>
            <Text className="font-heading mt-1 text-lg text-gray-900">{pendingKycCount}</Text>
          </Card>
        </View>

        <Chart
          title="Bookings + Revenue (7 days)"
          labels={MOCK_ADMIN_CHART_DATA.labels}
          xAxisLabel="Day"
          yAxisLabel="Count / PHP"
          series={[
            { name: 'Bookings', data: MOCK_ADMIN_CHART_DATA.bookings, color: '#6366F1' },
            { name: 'Revenue', data: MOCK_ADMIN_CHART_DATA.revenue, color: '#10B981' },
          ]}
        />

        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[13px] font-bold text-gray-900">Pending Transactions</Text>
            <Text className="text-[11px] text-gray-500">Latest updates</Text>
          </View>
          {MOCK_TRANSACTIONS.slice(0, 3).map((transaction) => (
            <Card key={transaction.id} className="mb-3 p-3">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-gray-900">
                  {transaction.clientName} → {transaction.handymanName}
                </Text>
                <Text className="text-[11px] text-gray-500">{transaction.paymentMethod}</Text>
              </View>
              <Text className="mb-2 text-[13px] text-gray-600">
                Booking {transaction.bookingId}
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
          ))}
        </View>

        <View>
          <Text className="mb-3 text-[13px] font-bold text-gray-900">Recent Activity</Text>
          {MOCK_ADMIN_FEED.map((item) => (
            <Card key={item.id} className="mb-3 p-3">
              <Text className="mb-1 text-sm font-semibold text-gray-900">{item.title}</Text>
              <Text className="mb-2 text-[13px] text-gray-600">{item.description}</Text>
              <Text className="text-[11px] text-gray-500">{formatDateTime(item.createdAt)}</Text>
            </Card>
          ))}
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
