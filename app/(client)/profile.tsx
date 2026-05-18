import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Avatar } from '../../src/components/ui/Avatar';
import { Card } from '../../src/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_CLIENT } from '../../src/mocks';
import { useTheme } from '../../src/context/ThemeContext';
import { ColorScheme } from '../../src/types';
import { COLOR_SCHEMES } from '../../src/constants/theme';

export default function ClientProfile() {
  const { scheme, setScheme } = useTheme();

  const MENU_ITEMS = [
    {
      icon: 'location-outline',
      title: 'Saved Addresses',
      subtitle: 'Manage your home & work locations',
    },
    { icon: 'card-outline', title: 'Payment Methods', subtitle: 'Add or remove cards' },
    { icon: 'settings-outline', title: 'Settings', subtitle: 'Notifications, password, theme' },
    { icon: 'help-buoy-outline', title: 'Help & Support', subtitle: 'Contact us or view FAQs' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar title="My Profile" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="items-center py-4">
          <Avatar name={MOCK_CLIENT.name} photoUrl={MOCK_CLIENT.photoUrl} size={80} />
          <Text className="font-heading mt-3 text-lg text-gray-900">{MOCK_CLIENT.name}</Text>
          <Text className="mt-1 text-[13px] text-gray-500">Member since 2023</Text>
        </View>

        <Card className="mt-3 overflow-hidden p-0">
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`flex-row items-center p-4 ${index !== MENU_ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <View className="bg-primary-50 h-10 w-10 items-center justify-center rounded-full">
                <Ionicons name={item.icon as never} size={18} color="#4F46E5" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">{item.title}</Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity className="mt-5 mb-3 items-center">
          <Text className="text-[13px] font-bold text-red-500">Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
