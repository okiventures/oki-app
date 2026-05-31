import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';

export default function ClientLogin() {
  const router = useRouter();
  const { colors } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
    () => identifierIsValid && password.trim().length > 0,
    [identifierIsValid, password]
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <Card className="flex flex-col gap-4 mt-6 px-8 py-12">
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
              error={identifier.length > 0 && !identifierIsValid ? 'Use a valid email address or a phone number with at least 10 digits.' : undefined}
              helperText={identifier.length === 0 ? 'Email must look like name@example.com, or phone must have at least 10 digits.' : undefined}
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
                helperText={password.length === 0 ? 'Password is required.' : undefined}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
                />
                <TouchableOpacity className="items-end">
                    <Text className="text-[12px] font-semibold text-gray-500">Forgot password?</Text>
                </TouchableOpacity>
            </View>
          </Form>

          <Button
            label="Continue"
            onPress={() => router.replace('/(auth)/onboarding')}
            fullWidth
            disabled={!canContinue}
          />
        </Card>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
