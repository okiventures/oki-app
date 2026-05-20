import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { ColorScheme } from '../src/types';
import { COLOR_SCHEMES } from '../src/constants/theme';

export default function LandingPage() {
  const { scheme, setScheme, colors } = useTheme();

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 24, paddingVertical: 64, alignItems: 'center' }}>
      <Text className="font-heading mb-2 text-3xl text-gray-900">Oki App</Text>
      <Text className="mb-5 text-center font-sans text-[13px] text-gray-500">
        Select a flow to test the UI.
      </Text>

      {/* Theme Selection */}
      <View className="mb-6 w-full">
        <Text className="font-heading mb-2 text-[13px] tracking-wider text-gray-700 uppercase">
          App Theme
        </Text>
        <View className="flex-row gap-2">
          {(['crimson', 'teal', 'indigo'] as ColorScheme[]).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setScheme(s)}
              style={{
                borderColor: scheme === s ? COLOR_SCHEMES[s].primary['500'] : '#E5E7EB',
                backgroundColor: scheme === s ? COLOR_SCHEMES[s].primary['50'] : '#FFFFFF',
              }}
              className="flex-1 flex-row items-center justify-center rounded-lg border p-2">
              <View
                style={{ backgroundColor: COLOR_SCHEMES[s].primary['500'] }}
                className="mr-2 h-3 w-3 rounded-full"
              />
              <Text
                style={{ color: scheme === s ? COLOR_SCHEMES[s].primary['700'] : '#374151' }}
                className="text-[12px] font-bold">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="mb-5 w-full gap-2">
        <Text className="font-heading mb-1 text-[13px] tracking-wider text-gray-700 uppercase">
          Client Flow
        </Text>
        <Link href="/(client)/login" asChild>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary['50'] }}
            className="w-full items-center rounded-lg py-2">
            <Text style={{ color: colors.primary['700'] }} className="font-semibold">
              Onboarding / KYC
            </Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(client)" asChild>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary['600'] }}
            className="w-full items-center rounded-lg py-2">
            <Text className="font-semibold text-white">Client Home</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(client)/bookings" asChild>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary['50'] }}
            className="w-full items-center rounded-lg py-2">
            <Text style={{ color: colors.primary['700'] }} className="font-semibold">
              Client Bookings
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="mb-5 w-full gap-2">
        <Text className="font-heading mb-1 text-[13px] tracking-wider text-gray-700 uppercase">
          Handyman Flow
        </Text>
        <Link href="/(handyman)" asChild>
          <TouchableOpacity className="w-full items-center rounded-lg bg-blue-600 py-2">
            <Text className="font-semibold text-white">Handyman Dashboard</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(handyman)/requests" asChild>
          <TouchableOpacity className="w-full items-center rounded-lg bg-blue-50 py-2">
            <Text className="font-semibold text-blue-700">Incoming Requests</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View className="w-full gap-2">
        <Text className="font-heading mb-1 text-[13px] tracking-wider text-gray-700 uppercase">
          Admin Flow
        </Text>
        <Link href="/(admin)" asChild>
          <TouchableOpacity className="w-full items-center rounded-lg bg-gray-800 py-2">
            <Text className="font-semibold text-white">Admin Dashboard</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
