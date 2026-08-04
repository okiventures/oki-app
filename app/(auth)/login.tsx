import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

export default function ClientLogin() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    login,
    isSigningIn,
    isSendingOtp,
    isGoogleSigningIn,
    sendEmailOtp,
    sendPhoneOtp,
    signInWithGoogle,
    error,
    clearError,
  } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);
  const phoneDigits = identifier.replace(/\D/g, '');

  const identifierIsValid = useMemo(() => {
    const trimmedIdentifier = identifier.trim();
    if (trimmedIdentifier.length === 0) {
      return false;
    }

    if (trimmedIdentifier.includes('@')) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedIdentifier);
    }

    return phoneDigits.length >= 10;
  }, [identifier, phoneDigits.length]);

  const canContinue = useMemo(
    () => identifierIsValid && password.trim().length > 0 && !isSigningIn,
    [identifierIsValid, password, isSigningIn]
  );

  const handleLogin = async () => {
    try {
      clearError();
      const isEmail = identifier.includes('@');
      await login({
        email: isEmail ? identifier.trim() : undefined,
        phone: !isEmail ? identifier.replace(/\D/g, '') : undefined,
        password: password.trim(),
      });
      // Navigation happens automatically via AuthContext and root layout
    } catch {
      setShowError(true);
    }
  };

  const handleOtpLogin = async () => {
    try {
      clearError();
      const isEmail = identifier.includes('@');
      if (isEmail) {
        await sendEmailOtp(identifier.trim());
        router.push({
          pathname: '/(auth)/otp-verify',
          params: { identifier: identifier.trim(), type: 'email' },
        });
      } else {
        await sendPhoneOtp(phoneDigits);
        router.push({
          pathname: '/(auth)/otp-verify',
          params: { identifier: phoneDigits, type: 'sms' },
        });
      }
    } catch {
      setShowError(true);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      await signInWithGoogle();
      // Navigation happens automatically via AuthContext and root layout
    } catch {
      setShowError(true);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Card className="mt-6 flex flex-col gap-4 px-8 py-12">
          <View className="items-center">
            <View
              style={{ backgroundColor: colors.primary['50'] }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-2xl">
              <Ionicons name="sparkles" size={26} color={colors.primary['600']} />
            </View>
            <Text className="font-heading text-2xl text-gray-900">Oki, Welcome!</Text>
            <Text className="mt-2 text-center text-[13px] text-gray-500">
              Sign in to continue your onboarding.
            </Text>
          </View>
          <Form gap={3}>
            <Input
              label="Email or phone"
              placeholder="you@email.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              error={
                identifier.length > 0 && !identifierIsValid
                  ? 'Use a valid email address or a phone number with at least 10 digits.'
                  : undefined
              }
              leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
            />
            <View className="mb-4">
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                secureToggle
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
              />
              <TouchableOpacity
                className="items-end"
                onPress={() => router.push('/forgot-password')}>
                <Text className="text-[12px] font-semibold text-gray-500">Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </Form>

          <Button
            label="Continue"
            onPress={handleLogin}
            fullWidth
            loading={isSigningIn}
            disabled={!canContinue}
          />

          <View className="my-1 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-gray-200" />
            <Text className="text-[11px] text-gray-400">OR</Text>
            <View className="h-px flex-1 bg-gray-200" />
          </View>

          <Button
            label="Continue with Google"
            variant="tertiary"
            fullWidth
            loading={isGoogleSigningIn}
            onPress={handleGoogleSignIn}
            leftIcon={<Ionicons name="logo-google" size={16} color="#4285F4" />}
          />

          <Pressable
            accessibilityLabel="Sign in with a one-time code"
            onPress={handleOtpLogin}
            disabled={!identifierIsValid || isSendingOtp}
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            style={({ pressed }) => ({
              opacity: pressed || !identifierIsValid || isSendingOtp ? 0.6 : 1,
            })}
            className="mt-1 flex-row items-center justify-center gap-2 rounded-full border border-gray-200 py-3">
            {isSendingOtp ? (
              <ActivityIndicator size="small" color={colors.primary['600']} />
            ) : (
              <Ionicons name="keypad-outline" size={16} color={colors.primary['600']} />
            )}
            <Text className="text-[13px] font-semibold" style={{ color: colors.primary['600'] }}>
              {identifier.includes('@') ? 'Send me an email code' : 'Send me an SMS code'}
            </Text>
          </Pressable>

          <View className="items-center">
            <Text className="text-center text-[13px] text-gray-600">
              Don&apos;t have an account?{' '}
              <Text
                onPress={() => router.push('/(auth)/onboarding')}
                className="text-primary-600 font-semibold">
                Sign up
              </Text>
            </Text>
          </View>
        </Card>

        {showError && error && (
          <Toast
            toast={{ id: 'error', message: error, type: 'error' }}
            onDismiss={() => {
              setShowError(false);
              clearError();
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
