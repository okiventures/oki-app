import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/ui/Button';

const VALUE_PROPS = [
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Verified pros',
    body: 'Every handyman passes ID and skill checks before taking jobs.',
  },
  {
    icon: 'pricetag-outline' as const,
    title: 'Price up front',
    body: 'See the full quote before you book. No surprises at the door.',
  },
  {
    icon: 'navigate-outline' as const,
    title: 'Track the job',
    body: 'Follow your handyman from accepted to on the way to finished.',
  },
];

// Seeded local accounts, all with the password below. Dev builds only — this block
// is stripped from production bundles by the __DEV__ guard.
const TEST_ACCOUNTS = [
  { email: 'princess@example.com', role: 'client' },
  { email: 'mara@example.com', role: 'client' },
  { email: 'kyle@example.com', role: 'handyman · electrical' },
  { email: 'cef@example.com', role: 'handyman · plumbing' },
  { email: 'rico@example.com', role: 'handyman · kyc pending' },
  { email: 'admin@oki.app', role: 'admin' },
];
const TEST_PASSWORD = 'password123';

export default function LandingPage() {
  const { colors } = useTheme();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [showAccounts, setShowAccounts] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary['600']} />
      </View>
    );
  }

  // The root layout only redirects out of the (auth) group, so an already
  // signed-in user landing here would otherwise sit on the marketing page.
  if (session) {
    const userType = session.user.userType;
    if (userType === 'admin') {
      return <Redirect href="/(admin)/" />;
    }
    if (userType === 'handyman') {
      return <Redirect href="/(handyman)/" />;
    }
    return <Redirect href="/(client)/" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center py-10">
          <View
            style={{ backgroundColor: colors.primary['600'] }}
            className="mb-6 h-16 w-16 items-center justify-center rounded-2xl">
            <Ionicons name="construct" size={30} color="#FFFFFF" />
          </View>

          <Text className="font-heading text-[34px] leading-[40px] text-gray-900">
            Home repairs,{'\n'}handled.
          </Text>
          <Text className="mt-3 text-[15px] leading-[22px] text-gray-500">
            Oki connects you with trusted handymen nearby — book in a few taps and follow the job
            through to done.
          </Text>

          <View className="mt-9 gap-6">
            {VALUE_PROPS.map((prop) => (
              <View key={prop.title} className="flex-row gap-3.5">
                <View
                  style={{ backgroundColor: colors.primary['50'] }}
                  className="h-10 w-10 items-center justify-center rounded-xl">
                  <Ionicons name={prop.icon} size={19} color={colors.primary['600']} />
                </View>
                <View className="flex-1">
                  <Text className="font-heading text-[15px] text-gray-900">{prop.title}</Text>
                  <Text className="mt-0.5 text-[13px] leading-[19px] text-gray-500">
                    {prop.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Button label="Log in" onPress={() => router.push('/(auth)/login')} fullWidth />
          <Button
            label="Create an account"
            variant="tertiary"
            onPress={() => router.push('/(auth)/onboarding')}
            fullWidth
          />
          <Text className="mt-1 text-center text-[11px] text-gray-400">
            Preview build · Cebu pilot
          </Text>
        </View>

        {__DEV__ && (
          <View className="mt-6 border-t border-gray-100 pt-4">
            <TouchableOpacity
              onPress={() => setShowAccounts((prev) => !prev)}
              className="flex-row items-center justify-center gap-1.5">
              <Ionicons
                name={showAccounts ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#9CA3AF"
              />
              <Text className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                Test accounts
              </Text>
            </TouchableOpacity>

            {showAccounts && (
              <View className="mt-3 gap-1.5 rounded-xl bg-gray-50 px-4 py-3">
                {TEST_ACCOUNTS.map((account) => (
                  <View key={account.email} className="flex-row justify-between">
                    <Text className="text-[11px] text-gray-600">{account.email}</Text>
                    <Text className="text-[11px] text-gray-400">{account.role}</Text>
                  </View>
                ))}
                <Text className="mt-1 text-[11px] text-gray-400">password: {TEST_PASSWORD}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
