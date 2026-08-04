import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { Input } from '../../src/components/ui/Input';
import { Toast } from '../../src/components/ui/Toast';
import { MOCK_CLIENT } from '../../src/mocks';
import { isMockEnv } from '../../src/services/bookingService';

export default function EditProfile() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { profile, isLoading, updateUser, updateHandyman, uploadAvatar } = useProfile();

  const isHandyman = session?.user?.userType === 'handyman';

  // Form state — seeded from profile or mock
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    id: string;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Seed form fields when profile or mock data is available
  useEffect(() => {
    if (profile) {
      setName(profile.user.full_name);
      setEmail(profile.user.email);
      setPhone(profile.user.phone ?? '');
      setPhotoUrl(profile.user.photo_url ?? undefined);
      if (profile.handyman) {
        setBio(profile.handyman.bio ?? '');
        setHourlyRate(profile.handyman.hourly_rate?.toString() ?? '');
        setYearsExperience(profile.handyman.years_experience?.toString() ?? '');
      }
    } else if (!session && isMockEnv()) {
      // Offline-demo identity only. `!session` alone also seeded these against a
      // live backend, so a signed-out user was handed someone else's name and
      // contact details in a form whose save button writes them.
      // MOCK_CLIENT carries no email or phone, hence the literals.
      setName(MOCK_CLIENT.name);
      setEmail('ishah.b@example.com');
      setPhone('+63 912 345 6789');
      setPhotoUrl(MOCK_CLIENT.photoUrl);
    }
  }, [profile, session]);

  const handleAvatarPress = useCallback(async () => {
    try {
      const url = await uploadAvatar('gallery');
      setPhotoUrl(url);
      setToastMessage({ id: 'avatar', type: 'success', message: 'Photo uploaded' });
    } catch (e) {
      if (e instanceof Error && e.message !== 'Image selection was cancelled') {
        setToastMessage({
          id: 'avatar-error',
          type: 'error',
          message: e.message || 'Failed to upload photo',
        });
      }
    }
  }, [uploadAvatar]);

  const handleSave = useCallback(async () => {
    if (!session) {
      setToastMessage({ id: 'save', type: 'success', message: 'Changes saved (demo mode)' });
      router.back();
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        full_name: name.trim(),
        phone: phone.trim() || null,
        photo_url: photoUrl ?? null,
      });

      if (isHandyman) {
        await updateHandyman({
          bio: bio.trim() || null,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
          years_experience: yearsExperience ? parseInt(yearsExperience, 10) : undefined,
        });
      }

      setToastMessage({ id: 'save', type: 'success', message: 'Profile updated' });
      setTimeout(() => router.back(), 800);
    } catch (e) {
      setToastMessage({
        id: 'save-error',
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to save',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    session,
    name,
    phone,
    photoUrl,
    bio,
    hourlyRate,
    yearsExperience,
    isHandyman,
    updateUser,
    updateHandyman,
    router,
  ]);

  if (isLoading) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
        <ScreenHeader title="Edit Profile" showBack onBackPress={() => router.back()} />
        <View
          className="-mt-8 flex-1 items-center justify-center rounded-t-[32px]"
          style={{ backgroundColor: colors.ui.background }}>
          <ActivityIndicator size="large" color={colors.primary['600']} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Edit Profile" showBack onBackPress={() => router.back()} />
      <View
        className="-mt-8 flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingTop: 32, paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled">
            {/* Avatar */}
            <View className="mb-8 items-center">
              <View className="relative">
                <Avatar name={name || 'User'} photoUrl={photoUrl} size={100} />
                <Pressable
                  onPress={handleAvatarPress}
                  className="absolute right-0 bottom-0 rounded-full border-[3px] p-2"
                  style={{
                    backgroundColor: colors.primary['500'],
                    borderColor: colors.ui.background,
                  }}
                  accessibilityLabel="Change profile photo">
                  <Ionicons name="camera" size={18} color="#FFF" />
                </Pressable>
              </View>
              <Text className="mt-2 text-[11px] text-gray-400">Tap camera to change photo</Text>
            </View>

            {/* User fields */}
            <View className="gap-5">
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                editable={!isSaving}
                error={
                  name.length > 0 && name.trim().length < 2 ? 'At least 2 characters' : undefined
                }
              />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isSaving}
              />

              {/* Handyman-specific fields */}
              {isHandyman && (
                <>
                  <View className="my-2 border-t border-gray-100" />
                  <Text className="text-[13px] font-semibold text-gray-500">Handyman Details</Text>
                  <Input
                    label="Bio"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell clients about your experience..."
                    multiline
                    editable={!isSaving}
                  />
                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Input
                        label="Hourly Rate (₱)"
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        editable={!isSaving}
                      />
                    </View>
                    <View className="flex-1">
                      <Input
                        label="Years Experience"
                        value={yearsExperience}
                        onChangeText={setYearsExperience}
                        keyboardType="number-pad"
                        placeholder="0"
                        editable={!isSaving}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          {/* Save button — fixed at bottom */}
          <View
            className="border-t p-5"
            style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
            <Button
              label={isSaving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              fullWidth
              loading={isSaving}
              disabled={isSaving || name.trim().length < 2}
            />
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Toast messages */}
      {toastMessage && (
        <Toast
          toast={{
            id: toastMessage.id,
            type: toastMessage.type,
            message: toastMessage.message,
          }}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </SafeAreaView>
  );
}
