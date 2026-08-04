import React, { useMemo, useState } from 'react';
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
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

type SignupStep = 'role' | 'form';
// No admin role. handle_new_user() only honours 'handyman' from signup metadata
// and collapses everything else to 'client', so the admin card produced a client
// account labelled "Admin account" on the very next screen. Admins are
// provisioned with the service role.
type UserRole = 'client' | 'handyman';

const ROLE_CARDS: { role: UserRole; icon: string; label: string; desc: string }[] = [
  {
    role: 'client',
    icon: 'person-outline',
    label: "I'm a Client",
    desc: 'Find and book trusted handymen',
  },
  {
    role: 'handyman',
    icon: 'construct-outline',
    label: "I'm a Handyman",
    desc: 'Offer your services and earn',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signup, isSigningUp, error, clearError } = useAuth();

  const [step, setStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);

  const phoneDigits = identifier.replace(/\D/g, '');
  const isEmail = identifier.includes('@');

  const identifierIsValid = useMemo(() => {
    const trimmed = identifier.trim();
    if (trimmed.length === 0) return false;
    if (isEmail) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return phoneDigits.length >= 10;
  }, [identifier, phoneDigits.length, isEmail]);

  const passwordIsValid = password.trim().length >= 8;
  const nameIsValid = fullName.trim().length >= 2;
  const canSubmit = identifierIsValid && passwordIsValid && nameIsValid && !isSigningUp;

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep('form');
  };

  const handleSignup = async () => {
    if (!selectedRole) return;
    try {
      clearError();
      const result = await signup({
        email: isEmail ? identifier.trim() : undefined,
        phone: !isEmail ? identifier.replace(/\D/g, '') : undefined,
        password: password.trim(),
        userType: selectedRole,
        fullName: fullName.trim(),
      });
      // Otherwise the session is set and the root layout handles routing.
      if (result.emailConfirmationRequired) {
        router.replace('/(auth)/email-confirm');
      }
    } catch {
      setShowError(true);
    }
  };

  if (step === 'role') {
    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{
          padding: 24,
          paddingVertical: 64,
          alignItems: 'center',
        }}>
        <View className="mb-8 items-center">
          <View
            style={{ backgroundColor: colors.primary['50'] }}
            className="mb-4 h-16 w-16 items-center justify-center rounded-2xl">
            <Ionicons name="sparkles" size={30} color={colors.primary['600']} />
          </View>
          <Text className="font-heading text-2xl text-gray-900">Join Oki</Text>
          <Text className="mt-2 text-center text-[13px] text-gray-500">
            Choose how you&apos;d like to get started
          </Text>
        </View>

        {ROLE_CARDS.map(({ role, icon, label, desc }) => (
          <Card key={role} className="mb-4 w-full p-6">
            <TouchableOpacity
              onPress={() => handleSelectRole(role)}
              className="flex-row items-center gap-4">
              <View
                style={{ backgroundColor: colors.primary['50'] }}
                className="h-12 w-12 items-center justify-center rounded-xl">
                <Ionicons name={icon as any} size={24} color={colors.primary['600']} />
              </View>
              <View className="flex-1">
                <Text className="font-heading text-[15px] text-gray-900">{label}</Text>
                <Text className="text-[12px] text-gray-500">{desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>
        ))}

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text className="text-[13px] font-semibold" style={{ color: colors.primary['600'] }}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View className="mb-4 flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              setStep('role');
              setSelectedRole(null);
            }}
            className="mr-3 h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.ui.border }}>
            <Ionicons name="arrow-back" size={16} color={colors.ui.text} />
          </TouchableOpacity>
          <View>
            <Text className="font-heading text-lg text-gray-900">Create your account</Text>
            <Text className="text-[12px] text-gray-500" style={{ color: colors.primary['600'] }}>
              {selectedRole === 'client' ? 'Client' : 'Handyman'} account
            </Text>
          </View>
        </View>

        <Card className="mt-2 flex flex-col gap-4 px-8 py-10">
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
              label="Email or phone"
              placeholder="you@email.com"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType={isEmail ? 'email-address' : 'phone-pad'}
              editable={!isSigningUp}
              error={
                identifier.length > 0 && !identifierIsValid
                  ? 'Enter a valid email or phone (10+ digits)'
                  : undefined
              }
              leftIcon={
                <Ionicons
                  name={isEmail ? 'mail-outline' : 'call-outline'}
                  size={18}
                  color="#9CA3AF"
                />
              }
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
            label={isSigningUp ? undefined : 'Create Account'}
            onPress={handleSignup}
            fullWidth
            loading={isSigningUp}
            disabled={!canSubmit}
          />
        </Card>

        <View className="items-center pb-8">
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text className="text-[13px] font-semibold" style={{ color: colors.primary['600'] }}>
              Already have an account? Sign in
            </Text>
          </TouchableOpacity>
        </View>

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
