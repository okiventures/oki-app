import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

export default function ClientSignupScreen() {
  const router = useRouter();
  const { signup, isSigningUp, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);

  const nameIsValid = fullName.trim().length >= 2;
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordIsValid = password.trim().length >= 8;
  const canSubmit = nameIsValid && emailIsValid && passwordIsValid && !isSigningUp;

  const handleSignup = async () => {
    try {
      clearError();
      const result = await signup({
        email: email.trim(),
        password: password.trim(),
        userType: 'client',
        fullName: fullName.trim(),
      });
      if (result.emailConfirmationRequired) {
        router.replace('/(auth)/email-confirm');
      }
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
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4 flex-row items-center gap-2">
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text className="text-[13px] text-gray-500">Back</Text>
        </TouchableOpacity>

        <Card className="flex flex-col gap-4 px-8 py-12">
          <View className="items-center">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <Ionicons name="person-outline" size={26} color="#6366F1" />
            </View>
            <Text className="font-heading text-2xl text-gray-900">Join as Client</Text>
            <Text className="mt-2 text-center text-[13px] text-gray-500">
              Create your account to find and book trusted handymen.
            </Text>
          </View>

          <Form gap={3}>
            <Input
              label="Full name"
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!isSigningUp}
              error={fullName.length > 0 && !nameIsValid ? 'Use at least 2 characters' : undefined}
              leftIcon={<Ionicons name="person-outline" size={18} color="#9CA3AF" />}
            />
            <Input
              label="Email"
              placeholder="you@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isSigningUp}
              error={email.length > 0 && !emailIsValid ? 'Enter a valid email address' : undefined}
              leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              editable={!isSigningUp}
              error={
                password.length > 0 && !passwordIsValid
                  ? 'Password must be at least 8 characters'
                  : undefined
              }
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />}
            />
          </Form>

          <Button
            label="Create Client Account"
            onPress={handleSignup}
            fullWidth
            loading={isSigningUp}
            disabled={!canSubmit}
          />

          <View className="items-center">
            <Text className="text-center text-[13px] text-gray-600">
              Already have an account?{' '}
              <Text
                onPress={() => router.replace('/(auth)/login')}
                className="font-semibold text-indigo-600">
                Sign in
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
