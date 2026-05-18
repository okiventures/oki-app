import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Avatar } from '../../src/components/ui/Avatar';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_CLIENT } from '../../src/mocks';

export default function ClientProfile() {
  const MENU_ITEMS = [
    { icon: 'location-outline', title: 'Saved Addresses', subtitle: 'Manage your home & work locations' },
    { icon: 'card-outline', title: 'Payment Methods', subtitle: 'Add or remove cards' },
    { icon: 'settings-outline', title: 'Settings', subtitle: 'Notifications, password, theme' },
    { icon: 'help-buoy-outline', title: 'Help & Support', subtitle: 'Contact us or view FAQs' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="My Profile" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="items-center py-6">
          <Avatar name={MOCK_CLIENT.name} photoUrl={MOCK_CLIENT.photoUrl} size={80} />
          <Text className="font-heading text-xl text-gray-900 mt-4">{MOCK_CLIENT.name}</Text>
          <Text className="text-sm text-gray-500 mt-1">Member since 2023</Text>
        </View>

        <View className="gap-3 mt-4">
          {MENU_ITEMS.map((item, index) => (
            <Card key={index} className="p-0 overflow-hidden">
              <TouchableOpacity className="flex-row items-center p-4">
                <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center">
                  <Ionicons name={item.icon as never} size={20} color="#4F46E5" />
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-[15px] font-bold text-gray-900">{item.title}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </Card>
          ))}
        </View>
        
        <TouchableOpacity className="mt-8 mb-4 items-center">
          <Text className="text-sm font-bold text-red-500">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
