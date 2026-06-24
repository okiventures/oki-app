import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { Chart } from '../../src/components/admin/Chart';
import { MOCK_ADMIN_CHART_DATA, MOCK_ADMIN_FEED, MOCK_TRANSACTIONS } from '../../src/mocks';
import { useAdmin } from '../../src/context/AdminContext';
import { DisputeStatus } from '../../src/types';
import { formatCurrency, formatDateTime } from '../../src/utils';

export default function AdminDashboard() {
  const { users, disputes, pendingKycCount, activeDisputesCount } = useAdmin();
  const activeUsers = users.filter((user) => user.status === 'Active').length;

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Admin Panel" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Ionicons name="people" size={20} color="#4F46E5" className="mb-2" />
            <Text className="text-[11px] text-gray-500 font-medium">Active Users</Text>
            <Text className="font-heading text-lg text-gray-900 mt-1">{activeUsers.toLocaleString()}</Text>
            <Text className="text-[10px] text-green-600 font-bold mt-1">Updated live</Text>
          </Card>
          <Card className="flex-1 p-3">
            <Ionicons name="cash" size={20} color="#10B981" className="mb-2" />
            <Text className="text-[11px] text-gray-500 font-medium">Revenue</Text>
            <Text className="font-heading text-lg text-gray-900 mt-1">{formatCurrency(285400)}</Text>
            <Text className="text-[10px] text-green-600 font-bold mt-1">+8.5%</Text>
          </Card>
        </View>

        <View className="flex-row gap-2">
          <Card className="flex-1 p-3">
            <Ionicons name="alert-circle" size={20} color="#EF4444" className="mb-2" />
            <Text className="text-[11px] text-gray-500 font-medium">Active Disputes</Text>
            <Text className="font-heading text-lg text-gray-900 mt-1">{activeDisputesCount}</Text>
            <Text className="text-[10px] text-red-600 font-bold mt-1">Needs Attention</Text>
          </Card>
          <Card className="flex-1 p-3">
            <Ionicons name="document-text" size={20} color="#F59E0B" className="mb-2" />
            <Text className="text-[11px] text-gray-500 font-medium">Pending KYC</Text>
            <Text className="font-heading text-lg text-gray-900 mt-1">{pendingKycCount}</Text>
            <Text className="text-[10px] text-gray-500 font-bold mt-1">In Queue</Text>
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
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[13px] font-bold text-gray-900">Pending Transactions</Text>
            <Text className="text-[11px] text-gray-500">Latest updates</Text>
          </View>
          {MOCK_TRANSACTIONS.slice(0, 3).map((transaction) => (
            <Card key={transaction.id} className="mb-3 p-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-gray-900">{transaction.clientName} → {transaction.handymanName}</Text>
                <Text className="text-[11px] text-gray-500">{transaction.paymentMethod}</Text>
              </View>
              <Text className="text-[13px] text-gray-600 mb-2">Booking {transaction.bookingId}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-gray-800">{formatCurrency(transaction.amount)}</Text>
                <Text className="text-[11px] text-gray-500">{formatDateTime(transaction.createdAt)}</Text>
              </View>
            </Card>
          ))}
        </View>

        <View>
          <Text className="text-[13px] font-bold text-gray-900 mb-3">Recent Activity</Text>
          {MOCK_ADMIN_FEED.map((item) => (
            <Card key={item.id} className="mb-3 p-3">
              <Text className="text-sm font-semibold text-gray-900 mb-1">{item.title}</Text>
              <Text className="text-[13px] text-gray-600 mb-2">{item.description}</Text>
              <Text className="text-[11px] text-gray-500">{formatDateTime(item.createdAt)}</Text>
            </Card>
          ))}
        </View>

        <View className="mt-2">
          <TouchableOpacity className="bg-primary-600 rounded-2xl py-3 items-center">
            <Text className="text-sm font-bold text-white">View full analytics</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
