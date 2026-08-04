import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { Toast } from '../../src/components/ui/Toast';

export default function OtpVerifyScreen() {
  const params = useLocalSearchParams<{ identifier?: string; type?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { sendEmailOtp, sendPhoneOtp, verifyOtp, isSendingOtp, isVerifyingOtp, error, clearError } =
    useAuth();

  const [identifier, setIdentifier] = useState(params.identifier ?? '');
  const [code, setCode] = useState('');
  const [showError, setShowError] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(params.identifier ?? null);
  const [sentType, setSentType] = useState<'email' | 'sms' | null>(
    params.type === 'sms' ? 'sms' : params.type === 'email' ? 'email' : null
  );

  const isEmail = useMemo(() => identifier.includes('@'), [identifier]);
  const phoneDigits = identifier.replace(/\D/g, '');
  const identifierValid = isEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())
    : phoneDigits.length >= 10;
  const canSend = identifierValid && !isSendingOtp;
  const canVerify = code.trim().length === 6 && identifierValid && !isVerifyingOtp;

  const sendCode = async () => {
    try {
      clearError();
      if (isEmail) {
        await sendEmailOtp(identifier.trim());
        setSentType('email');
      } else {
        await sendPhoneOtp(phoneDigits);
        setSentType('sms');
      }
      setSentTo(isEmail ? identifier.trim() : phoneDigits);
    } catch {
      setShowError(true);
    }
  };

  const handleVerify = async () => {
    try {
      clearError();
      await verifyOtp({
        email: isEmail ? identifier.trim() : undefined,
        phone: !isEmail ? phoneDigits : undefined,
        token: code.trim(),
      });
      // Session set — the root layout routes to the correct home by role.
    } catch {
      setShowError(true);
    }
  };

  const channelLabel = sentType === 'sms' ? 'SMS' : 'Email';
  const channelIcon = sentType === 'sms' ? 'phone-portrait-outline' : 'mail-outline';

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
            <View
              style={{ backgroundColor: colors.primary['50'] }}
              className="mb-4 h-14 w-14 items-center justify-center rounded-2xl">
              <Ionicons name={channelIcon} size={26} color={colors.primary['600']} />
            </View>
            <Text className="font-heading text-2xl text-gray-900">Enter your code</Text>
            <Text className="mt-2 text-center text-[13px] leading-5 text-gray-500">
              {sentTo
                ? `We sent a ${channelLabel} verification code to ${sentTo}.`
                : 'Enter your email or phone to receive a one-time verification code.'}
            </Text>
          </View>

          <View className="gap-3">
            <Input
              label="Email or phone"
              placeholder="you@email.com or 09171234567"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                setSentTo(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isVerifyingOtp}
              error={
                identifier.length > 0 && !identifierValid
                  ? 'Use a valid email address or a phone number with at least 10 digits.'
                  : undefined
              }
              leftIcon={<Ionicons name="at-outline" size={18} color="#9CA3AF" />}
            />
            <Input
              label="Verification code"
              placeholder="6-digit code"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              editable={!isVerifyingOtp}
              error={code.length > 0 && code.length < 6 ? 'Enter the 6-digit code' : undefined}
              leftIcon={<Ionicons name="keypad-outline" size={18} color="#9CA3AF" />}
            />
          </View>

          <Button
            label="Send code"
            onPress={sendCode}
            fullWidth
            variant="secondary"
            loading={isSendingOtp}
            disabled={!canSend}
          />

          <Button
            label="Verify & Continue"
            onPress={handleVerify}
            fullWidth
            loading={isVerifyingOtp}
            disabled={!canVerify}
          />

          <View className="items-center">
            <Text className="text-center text-[13px] text-gray-500">
              Didn&apos;t receive it?{' '}
              <Text onPress={sendCode} className="text-primary-600 font-semibold">
                Resend code
              </Text>
            </Text>
          </View>
        </Card>

        {showError && error && (
          <Toast
            toast={{ id: 'otp-error', message: error, type: 'error' }}
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
