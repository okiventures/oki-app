import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { requestPasswordReset, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const handleResetPassword = async () => {
    try {
      clearError();
      setIsLoading(true);
      await requestPasswordReset(email.trim());
      setShowSuccess(true);
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch {
      setShowError(true);
    } finally {
      setIsLoading(false);
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
              <Ionicons name="shield-outline" size={26} color={colors.primary['600']} />
            </View>
            <Text className="font-heading text-2xl text-gray-900">Reset Password</Text>
            <Text className="mt-2 text-center text-[13px] text-gray-600">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </Text>
          </View>

          <Form gap={3}>
            <Input
              label="Email address"
              placeholder="you@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
              error={email.length > 0 && !isValidEmail ? 'Enter a valid email address' : undefined}
              leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
            />
          </Form>

          <Button
            label="Send Reset Link"
            onPress={handleResetPassword}
            fullWidth
            loading={isLoading}
            disabled={!isValidEmail || isLoading}
          />

          <Button
            label="Back to Login"
            onPress={() => router.back()}
            variant="secondary"
            fullWidth
            disabled={isLoading}
          />
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

        {showSuccess && (
          <Toast
            toast={{
              id: 'success',
              message: 'Check your email for the password reset link',
              type: 'success',
            }}
            onDismiss={() => setShowSuccess(false)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
