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
        <View className="items-center py-4">
          <Avatar name={MOCK_HANDYMAN.name} photoUrl={MOCK_HANDYMAN.photoUrl} size={80} />
          <Text className="font-heading mt-3 text-lg text-gray-900">{MOCK_HANDYMAN.name}</Text>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="star" size={14} color="#EAB308" />
            <Text className="text-[13px] font-bold text-gray-700">{MOCK_HANDYMAN.rating}</Text>
            <Text className="text-[13px] text-gray-500">({MOCK_HANDYMAN.reviewCount} reviews)</Text>
          </View>
          <View className="mt-3 flex-row flex-wrap justify-center gap-2">
            {MOCK_HANDYMAN.skills.map((skill) => (
              <Badge key={skill} text={skill} variant="primary" />
            ))}
          </View>
        </View>

        <Card className="mb-4 items-center bg-gray-900 p-3">
          <Text className="mb-1 text-[13px] font-medium text-gray-400">Available Wallet Balance</Text>
          <Text className="font-heading mb-3 text-2xl text-white">{formatCurrency(1240.5)}</Text>
          <TouchableOpacity className="bg-primary-600 w-full items-center rounded-lg px-4 py-2.5">
            <Text className="text-[15px] font-bold text-white">Withdraw Funds</Text>
          </TouchableOpacity>
        </Card>

        <Card className="p-0 overflow-hidden">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Ionicons name="settings-outline" size={18} color="#2563EB" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[15px] font-bold text-gray-900">Settings</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">App preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Ionicons name="help-buoy-outline" size={18} color="#2563EB" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[15px] font-bold text-gray-900">Help & Support</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">Contact Oki Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </Card>

        <TouchableOpacity className="mt-5 mb-3 items-center">
          <Text className="text-[13px] font-bold text-red-500">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
