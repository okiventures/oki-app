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
          <Text className="text-[13px] font-bold text-gray-900 mb-3 px-1">Pending KYC Verifications</Text>
        }
        renderItem={({ item }) => (
          <Card className="mb-2 p-3 flex-row items-center">
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <Ionicons name="person" size={18} color="#9CA3AF" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-[15px] font-bold text-gray-900">{item.handymanName}</Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">{item.serviceCategory}</Text>
            </View>
            <View className="items-end gap-2">
              <Badge text={item.status} variant="warning" />
              <TouchableOpacity>
                <Text className="text-[11px] font-bold text-primary-600">Review</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
