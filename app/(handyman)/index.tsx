import React, { useState } from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_HANDYMAN } from '../../src/mocks';
import { formatCurrency } from '../../src/utils';

export default function HandymanDashboard() {
  const [isActive, setIsActive] = useState(MOCK_HANDYMAN.isOnline);

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Dashboard" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Active Status Toggle */}
        <Card className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Ionicons name={isActive ? 'radio-button-on' : 'radio-button-off'} size={20} color={isActive ? '#15803D' : '#6B7280'} />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-gray-900">{isActive ? 'Accepting Requests' : 'Offline'}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{isActive ? 'You are visible to clients.' : 'Go online to get jobs.'}</Text>
            </View>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: '#15803D' }} />
        </Card>

        {/* Earnings Overview */}
        <View className="flex-row gap-3">
          <Card className="flex-1 items-center py-5">
            <Ionicons name="wallet-outline" size={24} color="#6B7280" className="mb-2" />
            <Text className="text-xs text-gray-500 font-medium mb-1">Today</Text>
            <Text className="font-heading text-xl text-gray-900">{formatCurrency(120)}</Text>
          </Card>
          <Card className="flex-1 items-center py-5">
            <Ionicons name="stats-chart-outline" size={24} color="#6B7280" className="mb-2" />
            <Text className="text-xs text-gray-500 font-medium mb-1">This Week</Text>
            <Text className="font-heading text-xl text-gray-900">{formatCurrency(845)}</Text>
          </Card>
        </View>

        {/* Upcoming Schedule Snippet */}
        <Text className="font-heading text-lg text-gray-900 mt-2">Next Job</Text>
        <Card>
          <Text className="text-sm font-semibold text-gray-800">Plumbing Fix</Text>
          <Text className="text-xs text-gray-500 mt-1">Today, 2:00 PM • 123 Main St</Text>
        </Card>
      </ScrollView>
    </View>
  );
}
