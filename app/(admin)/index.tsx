import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_ADMIN_STATS } from '../../src/mocks';
import { formatCurrency } from '../../src/utils';

export default function AdminDashboard() {
  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Admin Panel" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        
        {/* KPI Grid */}
        <View className="flex-row gap-3">
          <Card className="flex-1 p-4">
            <Ionicons name="people" size={24} color="#4F46E5" className="mb-2" />
            <Text className="text-xs text-gray-500 font-medium">Active Users</Text>
            <Text className="font-heading text-xl text-gray-900 mt-1">{MOCK_ADMIN_STATS.activeUsers.toLocaleString()}</Text>
            <Text className="text-[10px] text-green-600 font-bold mt-1">{MOCK_ADMIN_STATS.activeUsersGrowth}</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Ionicons name="cash" size={24} color="#10B981" className="mb-2" />
            <Text className="text-xs text-gray-500 font-medium">Revenue</Text>
            <Text className="font-heading text-xl text-gray-900 mt-1">{formatCurrency(MOCK_ADMIN_STATS.totalRevenue)}</Text>
            <Text className="text-[10px] text-green-600 font-bold mt-1">{MOCK_ADMIN_STATS.revenueGrowth}</Text>
          </Card>
        </View>

        <View className="flex-row gap-3">
          <Card className="flex-1 p-4">
            <Ionicons name="alert-circle" size={24} color="#EF4444" className="mb-2" />
            <Text className="text-xs text-gray-500 font-medium">Active Disputes</Text>
            <Text className="font-heading text-xl text-gray-900 mt-1">{MOCK_ADMIN_STATS.activeDisputes}</Text>
            <Text className="text-[10px] text-red-600 font-bold mt-1">Needs Attention</Text>
          </Card>
          <Card className="flex-1 p-4">
            <Ionicons name="document-text" size={24} color="#F59E0B" className="mb-2" />
            <Text className="text-xs text-gray-500 font-medium">Pending KYC</Text>
            <Text className="font-heading text-xl text-gray-900 mt-1">{MOCK_ADMIN_STATS.pendingKYC}</Text>
            <Text className="text-[10px] text-gray-500 font-bold mt-1">In Queue</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <Text className="text-sm font-bold text-gray-900 mt-4 px-1">Quick Actions</Text>
        <Card className="p-0 overflow-hidden">
          <View className="flex-row items-center border-b border-gray-100 p-4">
            <Ionicons name="megaphone-outline" size={20} color="#6B7280" />
            <Text className="flex-1 ml-3 text-sm font-semibold text-gray-800">Send Global Announcement</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
          <View className="flex-row items-center p-4">
            <Ionicons name="settings-outline" size={20} color="#6B7280" />
            <Text className="flex-1 ml-3 text-sm font-semibold text-gray-800">System Preferences</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </Card>
        
      </ScrollView>
    </View>
  );
}
