import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth-client" />
      <Stack.Screen name="auth-handyman" />
      <Stack.Screen name="auth-admin" />
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="signup-client" />
      <Stack.Screen name="signup-handyman" />
      <Stack.Screen name="signup-admin" />
      <Stack.Screen name="email-confirm" />
      <Stack.Screen name="otp-verify" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
