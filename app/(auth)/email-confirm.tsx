import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';

export default function EmailConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 24, paddingVertical: 80, alignItems: 'center' }}>
      <View
        style={{ backgroundColor: '#DEF7EC' }}
        className="mb-6 h-20 w-20 items-center justify-center rounded-full">
        <Ionicons name="mail-open-outline" size={40} color="#059669" />
      </View>

      <Text className="font-heading mb-2 text-center text-2xl text-gray-900">Check your email</Text>
      <Text className="mb-8 text-center text-[14px] leading-6 text-gray-500">
        We&apos;ve sent a confirmation link to your email.{'\n'}
        Click the link to verify your account, then sign in.
      </Text>

      <View
        className="mb-8 w-full rounded-xl p-4"
        style={{ backgroundColor: colors.primary['50'] }}>
        <View className="flex-row items-start gap-3">
          <Ionicons name="information-circle-outline" size={20} color={colors.primary['600']} />
          <Text className="flex-1 text-[12px] leading-5 text-gray-600">
            Didn&apos;t receive the email? Check your spam folder, or try signing up with a
            different email address.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.replace('/(auth)/login')}
        className="w-full items-center rounded-full py-3"
        style={{ backgroundColor: colors.primary['600'] }}>
        <Text className="font-semibold text-white">Go to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
