import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_KYC_REQUESTS } from '../../src/mocks';

export default function AdminUsers() {
  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="User Management" />
      <FlatList
        data={MOCK_KYC_REQUESTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-sm font-bold text-gray-900 mb-4 px-1">Pending KYC Verifications</Text>
        }
        renderItem={({ item }) => (
          <Card className="mb-3 p-4 flex-row items-center">
            <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center">
              <Ionicons name="person" size={20} color="#9CA3AF" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-[15px] font-bold text-gray-900">{item.handymanName}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{item.serviceCategory}</Text>
            </View>
            <View className="items-end gap-2">
              <Badge text={item.status} variant="warning" />
              <TouchableOpacity>
                <Text className="text-xs font-bold text-primary-600">Review</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
