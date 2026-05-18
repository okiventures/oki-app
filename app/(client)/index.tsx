import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { MOCK_CLIENT } from '../../src/mocks';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '../../src/components/ui/Avatar';

export default function ClientHome() {
  const router = useRouter();

  const categories = [
    { name: 'Plumbing', icon: 'water' },
    { name: 'Electrical', icon: 'flash' },
    { name: 'Cleaning', icon: 'sparkles' },
    { name: 'Painting', icon: 'color-palette' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-5 pt-14 pb-4 rounded-b-3xl shadow-sm z-10">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-sm text-gray-500">Good morning,</Text>
            <Text className="text-2xl font-bold text-gray-900">{MOCK_CLIENT.name}</Text>
          </View>
          <Avatar name={MOCK_CLIENT.name} photoUrl={MOCK_CLIENT.photoUrl} size={48} />
        </View>
        <TouchableOpacity 
          className="bg-gray-100 p-3.5 rounded-xl flex-row items-center gap-2"
          onPress={() => router.push('/(client)/search')}
        >
          <Ionicons name="search" size={20} color="#6B7280" />
          <Text className="text-gray-500 font-medium text-[15px]">What do you need help with?</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-[17px] font-bold text-gray-900 mb-4">Categories</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-8">
          {categories.map((cat) => (
            <TouchableOpacity key={cat.name} className="items-center w-[22%]">
              <View className="w-16 h-16 bg-white rounded-2xl items-center justify-center shadow-sm mb-2">
                <Ionicons name={cat.icon as never} size={28} color="#0EA5E9" />
              </View>
              <Text className="text-xs font-semibold text-gray-700 text-center">{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-[17px] font-bold text-gray-900">Featured Handymen</Text>
          <TouchableOpacity>
            <Text className="text-sm font-semibold text-primary-600">See All</Text>
          </TouchableOpacity>
        </View>

        <Card className="mb-4">
          <View className="flex-row items-center">
            <Avatar name="Mike Torres" photoUrl="https://i.pravatar.cc/150?u=mike" size={56} />
            <View className="flex-1 ml-3">
              <Text className="text-base font-bold text-gray-900">Mike Torres</Text>
              <Text className="text-sm text-gray-500">Plumbing, Electrical</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text className="text-sm font-semibold text-gray-700 ml-1">4.9</Text>
                <Text className="text-xs text-gray-400 ml-1">(142 reviews)</Text>
              </View>
            </View>
            <TouchableOpacity className="bg-primary-50 px-4 py-2 rounded-full">
              <Text className="text-primary-600 font-bold text-sm">Hire</Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
