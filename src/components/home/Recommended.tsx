import React from 'react';
import { FlatList, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '../ui/Card';
import { MOCK_RECOMMENDED_SERVICES } from '../../mocks';
export default function Recommended() {
  const router = useRouter();
  return (
    <View className="mb-5 px-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-heading text-base text-gray-900">Recommended for you</Text>
        <TouchableOpacity onPress={() => router.push('/(client)/search')}>
          <Text className="text-primary-600 text-[13px] font-semibold">See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={MOCK_RECOMMENDED_SERVICES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(`/(client)/search?service=${encodeURIComponent(item.title)}`)
            }>
            <Card className="w-48 p-3">
              <Ionicons name={item.icon as never} size={24} color={item.color} className="mb-2" />
              <Text className="text-sm font-bold text-gray-900">{item.title}</Text>
              <Text className="mt-1 text-xs text-gray-500">Fix from ₱{item.price}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
