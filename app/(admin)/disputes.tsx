import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_DISPUTES } from '../../src/mocks';

export default function AdminDisputes() {
  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="Disputes" />
      <FlatList
        data={MOCK_DISPUTES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-sm font-bold text-gray-900 mb-4 px-1">Active Resolutions</Text>
        }
        renderItem={({ item }) => (
          <Card className="mb-3 p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Badge text={item.status} variant="error" />
              <Text className="text-xs text-gray-400">ID: {item.id}</Text>
            </View>
            <Text className="text-[15px] font-bold text-gray-900 mb-1">{item.reason}</Text>
            <Text className="text-sm text-gray-600 mb-4">
              <Text className="font-semibold text-gray-800">{item.clientName}</Text> reported <Text className="font-semibold text-gray-800">{item.handymanName}</Text>
            </Text>
            
            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 bg-gray-100 py-2 rounded-lg items-center">
                <Text className="text-sm font-bold text-gray-700">Details</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-gray-900 py-2 rounded-lg items-center">
                <Text className="text-sm font-bold text-white">Resolve</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
