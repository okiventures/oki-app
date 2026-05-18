import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../src/components/ui/Avatar';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { Card } from '../../src/components/ui/Card';
import { MOCK_CLIENT } from '../../src/mocks';

const CATEGORIES = [
  { name: 'Plumbing', icon: 'water-outline', color: '#3B82F6', bg: '#EFF6FF' },
  { name: 'Electrical', icon: 'flash-outline', color: '#EAB308', bg: '#FEFCE8' },
  { name: 'Cleaning', icon: 'sparkles-outline', color: '#10B981', bg: '#ECFDF5' },
  { name: 'Painting', icon: 'color-palette-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  { name: 'Carpentry', icon: 'hammer-outline', color: '#F97316', bg: '#FFF7ED' },
  { name: 'Appliance', icon: 'hardware-chip-outline', color: '#6366F1', bg: '#EEF2FF' },
];

export default function ClientHome() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-14 pb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-sm text-gray-500 font-medium">Current Location</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <Ionicons name="location-sharp" size={16} color="#4F46E5" />
            <Text className="text-[15px] font-bold text-gray-900">{MOCK_CLIENT.location}</Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </View>
        </View>
        <Avatar name={MOCK_CLIENT.name} photoUrl={MOCK_CLIENT.photoUrl} size={40} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View className="px-5 mb-6">
          <Text className="font-heading text-2xl text-gray-900 mb-4">What do you need help with?</Text>
          <SearchBar 
            value="" 
            onChangeText={() => {}} 
            placeholder="Search for a service..." 
            onFilterPress={() => {}}
          />
        </View>

        {/* Categories Grid */}
        <View className="px-5 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-heading text-lg text-gray-900">Categories</Text>
            <TouchableOpacity><Text className="text-sm text-primary-600 font-semibold">See All</Text></TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.name} 
                className="w-[30%] items-center"
                onPress={() => router.push(`/(client)/search?category=${cat.name}`)}
              >
                <View style={{ backgroundColor: cat.bg }} className="w-16 h-16 rounded-2xl items-center justify-center mb-2">
                  <Ionicons name={cat.icon as never} size={28} color={cat.color} />
                </View>
                <Text className="text-[11px] font-semibold text-gray-700 text-center">{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Active Booking Snippet */}
        <View className="px-5">
          <Text className="font-heading text-lg text-gray-900 mb-3">Recent Activity</Text>
          <Card className="bg-primary-50 border-0 shadow-none">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
                <Ionicons name="hammer-outline" size={20} color="#4F46E5" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Plumbing Service</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Mike Torres is working...</Text>
              </View>
              <TouchableOpacity className="bg-primary-600 px-4 py-2 rounded-full">
                <Text className="text-white text-xs font-bold">View</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
