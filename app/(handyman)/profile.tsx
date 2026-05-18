import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Avatar } from '../../src/components/ui/Avatar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_HANDYMAN } from '../../src/mocks';
import { formatCurrency } from '../../src/utils';

export default function HandymanProfile() {
  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Worker Profile" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="items-center py-6">
          <Avatar name={MOCK_HANDYMAN.name} photoUrl={MOCK_HANDYMAN.photoUrl} size={80} />
          <Text className="font-heading mt-4 text-xl text-gray-900">{MOCK_HANDYMAN.name}</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="star" size={14} color="#EAB308" />
            <Text className="text-sm font-bold text-gray-700">{MOCK_HANDYMAN.rating}</Text>
            <Text className="text-sm text-gray-500">({MOCK_HANDYMAN.reviewCount} reviews)</Text>
          </View>
          <View className="mt-3 flex-row flex-wrap justify-center gap-2">
            {MOCK_HANDYMAN.skills.map((skill) => (
              <Badge key={skill} text={skill} variant="primary" />
            ))}
          </View>
        </View>

        <Card className="mb-6 items-center bg-gray-900 p-5">
          <Text className="mb-1 text-sm font-medium text-gray-400">Available Wallet Balance</Text>
          <Text className="font-heading mb-4 text-3xl text-white">{formatCurrency(1240.5)}</Text>
          <TouchableOpacity className="bg-primary-600 w-full items-center rounded-xl px-6 py-2.5">
            <Text className="text-[15px] font-bold text-white">Withdraw Funds</Text>
          </TouchableOpacity>
        </Card>

        <View className="gap-3">
          <Card className="overflow-hidden p-0">
            <TouchableOpacity className="flex-row items-center p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Ionicons name="settings-outline" size={20} color="#2563EB" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Settings</Text>
                <Text className="mt-0.5 text-xs text-gray-500">App preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>
          <Card className="overflow-hidden p-0">
            <TouchableOpacity className="flex-row items-center p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Ionicons name="help-buoy-outline" size={20} color="#2563EB" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Help & Support</Text>
                <Text className="mt-0.5 text-xs text-gray-500">Contact Oki Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>
        </View>

        <TouchableOpacity className="mt-8 mb-4 items-center">
          <Text className="text-sm font-bold text-red-500">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
