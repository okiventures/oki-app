import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, View, Text, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { confirmPasswordReset, error, clearError } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setShowError(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    }
  }, [token, router]);

  const isPasswordValid = newPassword.length >= 8;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const canSubmit = isPasswordValid && passwordsMatch;

  const handleResetPassword = async () => {
    if (!token) return;

    try {
      clearError();
      setIsLoading(true);
      await confirmPasswordReset(token, newPassword);
      setShowSuccess(true);
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 2000);
    } catch {
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-red-600">Invalid reset link</Text>
      </View>
    );
  }

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
              <Ionicons name="lock-closed-outline" size={26} color={colors.primary['600']} />
            </View>
            <Text className="font-heading text-2xl text-gray-900">Set New Password</Text>
            <Text className="mt-2 text-center text-[13px] text-gray-600">
              Enter a strong password for your account.
            </Text>
          </View>

          <Form gap={3}>
            <Input
              label="New password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              secureToggle
              editable={!isLoading}
              error={
                newPassword.length > 0 && !isPasswordValid
                  ? 'Password must be at least 8 characters'
                  : undefined
              }
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
            />
            <Input
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              secureToggle
              editable={!isLoading}
              error={
                confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined
              }
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
            />
          </Form>

          <Button
            label="Update Password"
            onPress={handleResetPassword}
            fullWidth
            loading={isLoading}
            disabled={!canSubmit || isLoading}
          />
        </Card>

        {showError && (
          <Toast
            toast={{ id: 'error', message: error || 'Failed to reset password', type: 'error' }}
            onDismiss={() => {
              setShowError(false);
              clearError();
            }}
          />
        )}

        {showSuccess && (
          <Toast
            toast={{ id: 'success', message: 'Password reset successful', type: 'success' }}
            onDismiss={() => setShowSuccess(false)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
