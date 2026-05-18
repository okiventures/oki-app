import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function LandingPage() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="mb-2 text-3xl font-bold text-gray-900">Oki App</Text>
      <Text className="mb-8 text-center text-sm text-gray-500">
        Welcome! Select a flow to test the existing pages.
      </Text>

      <View className="w-full gap-4">
        <Link href="/(client)" asChild>
          <TouchableOpacity className="bg-primary-600 w-full items-center rounded-xl py-3.5">
            <Text className="font-semibold text-white">Client Home</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(client)/bookings" asChild>
          <TouchableOpacity className="w-full items-center rounded-xl bg-gray-100 py-3.5">
            <Text className="font-semibold text-gray-700">Client Bookings</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/(client)/search" asChild>
          <TouchableOpacity className="w-full items-center rounded-xl bg-gray-100 py-3.5">
            <Text className="font-semibold text-gray-700">Client Search</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
