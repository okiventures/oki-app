import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';

const DEMO_CREDS = {
  admin: { email: 'demo-admin@oki.test', password: 'Demo@123' },
  handyman: { email: 'demo-hm@oki.test', password: 'Demo@123' },
};

export default function LandingPage() {
  const { colors } = useTheme();
  const { session, logout, login } = useAuth();
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const userType = session?.user?.userType;

  const handleDemoLogin = async (role: 'admin' | 'handyman') => {
    setLoggingIn(role);
    setLoginError(null);
    try {
      await login({ email: DEMO_CREDS[role].email, password: DEMO_CREDS[role].password });
    } catch {
      setLoginError(`Failed to login as ${role}. The demo account may need setup.`);
    } finally {
      setLoggingIn(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ padding: 24, paddingVertical: 64, alignItems: 'center' }}>
      <Text className="font-heading mb-2 text-3xl text-gray-900">Oki App</Text>
      <Text className="mb-5 text-center font-sans text-[13px] text-gray-500">
        {session ? `Logged in as ${userType}` : 'Select a flow to test the UI.'}
      </Text>

      {(!session || userType === 'client') && (
        <View className="mb-5 w-full gap-2">
          <Text className="font-heading mb-1 text-[13px] tracking-wider text-gray-700 uppercase">
            Client Flow
          </Text>
          {!session && (
            <Link href="/(auth)/auth-client" asChild>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary['50'] }}
                className="w-full items-center rounded-lg py-2">
                <Text style={{ color: colors.primary['700'] }} className="font-semibold">
                  Auth Entry
                </Text>
              </TouchableOpacity>
            </Link>
          )}
          <Link href="/(verification)/client/onboarding" asChild>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary['50'] }}
              className="w-full items-center rounded-lg py-2">
              <Text style={{ color: colors.primary['700'] }} className="font-semibold">
                Client Verification
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
      )}

      {(!session || userType === 'handyman') && (
        <View className="mb-5 w-full gap-2">
          <Text className="font-heading mb-1 text-[13px] tracking-wider text-gray-700 uppercase">
            Handyman Flow
          </Text>
          {!session && (
            <Link href="/(auth)/auth-handyman" asChild>
              <TouchableOpacity className="w-full items-center rounded-lg bg-blue-50 py-2">
                <Text className="font-semibold text-blue-700">Auth Entry</Text>
              </TouchableOpacity>
            </Link>
          )}
          <Link href="/(verification)/handyman/onboarding" asChild>
            <TouchableOpacity className="w-full items-center rounded-lg bg-blue-50 py-2">
              <Text className="font-semibold text-blue-700">Handyman Verification</Text>
            </TouchableOpacity>
          </Link>
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
      )}

      {(!session || userType === 'admin') && (
        <View className="w-full gap-2">
          <Text className="font-heading mb-1 text-[13px] tracking-wider text-gray-700 uppercase">
            Admin Flow
          </Text>
          {!session && (
            <Link href="/(auth)/auth-admin" asChild>
              <TouchableOpacity className="w-full items-center rounded-lg bg-gray-100 py-2">
                <Text className="font-semibold text-gray-700">Auth Entry</Text>
              </TouchableOpacity>
            </Link>
          )}
          <Link href="/(verification)/admin/onboarding" asChild>
            <TouchableOpacity className="w-full items-center rounded-lg bg-gray-100 py-2">
              <Text className="font-semibold text-gray-700">Admin Verification</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/(admin)" asChild>
            <TouchableOpacity className="w-full items-center rounded-lg bg-gray-800 py-2">
              <Text className="font-semibold text-white">Admin Dashboard</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}

      {/* Booking Lifecycle Demo */}
      <View className="mt-6 w-full gap-2">
        <Text className="font-heading mb-1 text-[13px] tracking-wider text-purple-700 uppercase">
          Development
        </Text>
        <Link href="/lifecycle-demo" asChild>
          <TouchableOpacity className="w-full items-center rounded-lg bg-purple-600 py-2">
            <View className="flex-row items-center gap-2">
              <Ionicons name="git-branch-outline" size={16} color="white" />
              <Text className="font-semibold text-white">Booking Lifecycle Demo</Text>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Demo Access — one-click login for testing */}
      <View className="mt-6 w-full gap-2">
        <Text className="font-heading mb-1 text-[13px] tracking-wider text-emerald-700 uppercase">
          Demo Access (one-click)
        </Text>
        <Text className="mb-1 text-[11px] text-gray-500">
          These accounts are pre-configured with known passwords for testing.
        </Text>

        <TouchableOpacity
          onPress={() => handleDemoLogin('admin')}
          disabled={loggingIn !== null}
          className="w-full items-center rounded-lg bg-gray-800 py-3">
          <View className="flex-row items-center gap-2">
            {loggingIn === 'admin' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="shield-checkmark-outline" size={16} color="white" />
            )}
            <Text className="font-semibold text-white">
              {loggingIn === 'admin' ? 'Signing in...' : 'Sign in as Demo Admin'}
            </Text>
          </View>
          <Text className="mt-0.5 text-[10px] text-gray-400">{DEMO_CREDS.admin.email}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleDemoLogin('handyman')}
          disabled={loggingIn !== null}
          className="w-full items-center rounded-lg bg-blue-600 py-3">
          <View className="flex-row items-center gap-2">
            {loggingIn === 'handyman' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="hammer-outline" size={16} color="white" />
            )}
            <Text className="font-semibold text-white">
              {loggingIn === 'handyman' ? 'Signing in...' : 'Sign in as Demo Handyman'}
            </Text>
          </View>
          <Text className="mt-0.5 text-[10px] text-blue-300">{DEMO_CREDS.handyman.email}</Text>
        </TouchableOpacity>

        {loginError ? (
          <View className="rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-[12px] text-red-600">{loginError}</Text>
          </View>
        ) : null}
      </View>

      {/* Logout */}
      {session && (
        <View className="mt-8 w-full">
          <TouchableOpacity
            onPress={() => logout()}
            className="flex-row items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3">
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text className="font-semibold text-red-600">Log Out</Text>
          </TouchableOpacity>
          <Text className="mt-2 text-center text-[11px] text-gray-400">
            Logged in as {session.user.email || session.user.phone}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
