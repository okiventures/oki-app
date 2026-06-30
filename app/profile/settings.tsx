import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/forms/Input';
import { Toast } from '../../src/components/ui/Toast';

export default function SettingsScreen() {
  const { colors, scheme, setScheme } = useTheme();
  const { requestPasswordReset, session } = useAuth();
  const router = useRouter();

  const userEmail = session?.user?.email ?? '';
  const [resetEmail, setResetEmail] = useState(userEmail);

  // Pre-fill email once session is available
  useEffect(() => {
    if (userEmail && !resetEmail) {
      setResetEmail(userEmail);
    }
  }, [userEmail, resetEmail]);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    id: string;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim());

  const handleSendReset = async () => {
    if (!emailIsValid) return;
    setIsSendingReset(true);
    try {
      const { emailSent } = await requestPasswordReset(resetEmail.trim());
      if (emailSent) {
        setToastMessage({
          id: 'reset-sent',
          type: 'success',
          message: 'Reset link sent! Check your email (and spam folder).',
        });
      } else {
        setToastMessage({
          id: 'reset-warn',
          type: 'error',
          message:
            'Email provider not configured in Supabase. Go to Supabase Dashboard → Authentication → Email Templates to enable it.',
        });
      }
      setShowResetForm(false);
      setResetEmail('');
    } catch (e) {
      setToastMessage({
        id: 'reset-error',
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to send reset link',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Settings" showBack onBackPress={() => router.back()} />
      <ScrollView
        className="flex-1 rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}
        contentContainerStyle={{ padding: 20, paddingTop: 32 }}
        showsVerticalScrollIndicator={false}>
        {/* Security Section */}
        <Text className="mb-3 ml-1 text-[12px] font-semibold tracking-wider text-gray-400 uppercase">
          Security
        </Text>
        <Card className="mb-6 overflow-hidden p-0">
          <Pressable
            onPress={() => setShowResetForm(!showResetForm)}
            className="flex-row items-center p-4"
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            accessibilityLabel="Change password">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary['50'] }}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.primary['600']} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-900">Change Password</Text>
              <Text className="mt-0.5 text-[12px] text-gray-500">
                Send a password reset link to your email
              </Text>
            </View>
            <Ionicons
              name={showResetForm ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9CA3AF"
            />
          </Pressable>

          {showResetForm && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View className="border-t border-gray-100 px-4 py-4">
                <Input
                  label="Email address"
                  placeholder="you@email.com"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSendingReset}
                  leftIcon={<Ionicons name="mail-outline" size={18} color="#9CA3AF" />}
                />
                <View className="mt-3">
                  <Button
                    label={isSendingReset ? 'Sending...' : 'Send Reset Link'}
                    onPress={handleSendReset}
                    fullWidth
                    loading={isSendingReset}
                    disabled={!emailIsValid || isSendingReset}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </Card>

        {/* Preferences Section */}
        <Text className="mb-3 ml-1 text-[12px] font-semibold tracking-wider text-gray-400 uppercase">
          Preferences
        </Text>
        <Card className="mb-6 overflow-hidden p-0">
          <Pressable
            onPress={() => router.push('/profile/notifications')}
            className="flex-row items-center border-b border-gray-100 p-4"
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            accessibilityLabel="Notification preferences">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary['50'] }}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary['600']} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-900">Notifications</Text>
              <Text className="mt-0.5 text-[12px] text-gray-500">Push, email, and SMS alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          {/* Theme picker */}
          <View className="p-4">
            <Text className="mb-3 text-[13px] font-semibold text-gray-500">App Theme</Text>
            <View className="gap-2">
              {(['crimson', 'teal', 'indigo'] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setScheme(s)}
                  className="flex-row items-center justify-between rounded-xl border p-3"
                  style={{
                    borderColor: scheme === s ? colors.primary['500'] : colors.ui.border,
                    backgroundColor:
                      scheme === s ? `${colors.primary['500']}15` : colors.ui.surface,
                  }}>
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{
                        backgroundColor:
                          s === 'crimson' ? '#A82839' : s === 'teal' ? '#2D7A7A' : '#5D2E8C',
                      }}
                      className="h-5 w-5 rounded-full"
                    />
                    <Text className="text-[14px] font-semibold" style={{ color: colors.ui.text }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </View>
                  {scheme === s && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary['500']} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        {/* Account Section */}
        <Text className="mb-3 ml-1 text-[12px] font-semibold tracking-wider text-gray-400 uppercase">
          Account
        </Text>
        <Card className="mb-6 overflow-hidden p-0">
          <Pressable
            onPress={() => router.push('/profile/edit')}
            className="flex-row items-center border-b border-gray-100 p-4"
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            accessibilityLabel="Edit profile">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary['50'] }}>
              <Ionicons name="person-outline" size={18} color={colors.primary['600']} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-900">Edit Profile</Text>
              <Text className="mt-0.5 text-[12px] text-gray-500">Name, photo, phone number</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/profile/addresses')}
            className="flex-row items-center p-4"
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            accessibilityLabel="Saved addresses">
            <View
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary['50'] }}>
              <Ionicons name="location-outline" size={18} color={colors.primary['600']} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-900">Saved Addresses</Text>
              <Text className="mt-0.5 text-[12px] text-gray-500">
                Manage your home & work locations
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        </Card>
      </ScrollView>

      {/* Toast messages */}
      {toastMessage && <Toast toast={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </SafeAreaView>
  );
}
