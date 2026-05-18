import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';

export default function LandingPage() {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24, paddingVertical: 64, alignItems: 'center' }}>
      <Text className="font-heading text-4xl text-gray-900 mb-2">Oki App</Text>
      <Text className="font-sans text-sm text-gray-500 mb-8 text-center">
        Select a flow to test the UI.
      </Text>

      <View className="w-full gap-3 mb-8">
        <Text className="font-heading text-sm text-gray-700 uppercase tracking-wider mb-1">Client Flow</Text>
        <Link href="/(client)" asChild>
          <TouchableOpacity className="w-full bg-primary-600 py-3.5 rounded-xl items-center">
            <Text className="text-white font-semibold">Client Home</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(client)/bookings" asChild>
          <TouchableOpacity className="w-full bg-primary-50 py-3.5 rounded-xl items-center">
            <Text className="text-primary-700 font-semibold">Client Bookings</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="w-full gap-3 mb-8">
        <Text className="font-heading text-sm text-gray-700 uppercase tracking-wider mb-1">Handyman Flow</Text>
        <Link href="/(handyman)" asChild>
          <TouchableOpacity className="w-full bg-blue-600 py-3.5 rounded-xl items-center">
            <Text className="text-white font-semibold">Handyman Dashboard</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(handyman)/requests" asChild>
          <TouchableOpacity className="w-full bg-blue-50 py-3.5 rounded-xl items-center">
            <Text className="text-blue-700 font-semibold">Incoming Requests</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="w-full gap-3">
        <Text className="font-heading text-sm text-gray-700 uppercase tracking-wider mb-1">Admin Flow</Text>
        <Link href="/(admin)" asChild>
          <TouchableOpacity className="w-full bg-gray-800 py-3.5 rounded-xl items-center">
            <Text className="text-white font-semibold">Admin Dashboard</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
