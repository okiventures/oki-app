import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../src/context/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Avatar } from '../../src/components/ui/Avatar';
import { Modal } from '../../src/components/ui/Modal';
import { Button } from '../../src/components/ui/Button';
import { ProfileMenuRow } from '../../src/components/profile/ProfileMenuRow';
import { MOCK_CLIENT } from '../../src/mocks';
import { isMockEnv } from '../../src/services/bookingService';

const ACCOUNT_ITEMS = [
  {
    icon: 'person-outline',
    title: 'Edit Profile',
    subtitle: 'Name, photo, phone number',
  },
  {
    icon: 'location-outline',
    title: 'Saved Addresses',
    subtitle: 'Manage your home & work locations',
  },
  {
    icon: 'card-outline',
    title: 'Payment Methods',
    subtitle: 'Add or remove cards',
  },
];

const PREFERENCES_ITEMS: {
  icon: string;
  title: string;
  subtitle: string;
  route?: string;
}[] = [
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    subtitle: 'Push, email, and SMS alerts',
    route: '/profile/notifications',
  },
  {
    icon: 'color-palette-outline',
    title: 'Theme',
    subtitle: 'Choose your colour scheme',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Privacy & Security',
    subtitle: 'Password, 2FA, data',
    route: '/profile/settings',
  },
];

const SUPPORT_ITEMS: {
  icon: string;
  title: string;
  subtitle: string;
  route?: string;
}[] = [
  {
    icon: 'flag-outline',
    title: 'My Reports',
    subtitle: 'View your submitted reports',
    route: '/report',
  },
  {
    icon: 'help-buoy-outline',
    title: 'Help & Support',
    subtitle: 'Contact us or view FAQs',
  },
  {
    icon: 'document-text-outline',
    title: 'Terms & Privacy Policy',
    subtitle: 'Legal information',
  },
];

export default function ClientProfile() {
  const { scheme, setScheme, colors } = useTheme();
  const { logout } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Use real profile data when available, fall back to mock for dev/testing
  // MOCK_CLIENT is the offline-demo identity only. Against a live backend an
  // unresolved profile must render blank rather than someone else's name.
  const displayName = profile?.user?.full_name ?? (isMockEnv() ? MOCK_CLIENT.name : '');
  const displayPhoto = profile?.user?.photo_url ?? (isMockEnv() ? MOCK_CLIENT.photoUrl : undefined);
  const memberSince = profile?.user?.created_at ?? (isMockEnv() ? MOCK_CLIENT.memberSince : null);
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Logout handled by AuthContext even on error
    } finally {
      setIsLoggingOut(false);
      setLogoutModalVisible(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.primary['600'] }}>
        <ScreenHeader
          title="My Profile"
          showSettings
          showNotifications
          onSettingsPress={() => router.push('/profile/settings')}
          onNotificationsPress={() => router.push('/notifications')}
        />

        <View
          className="flex-1 rounded-t-[32px] pb-9"
          style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
          <View className="items-center" style={{ marginTop: -44 }}>
            <View
              className="rounded-full border-4 border-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 6,
              }}>
              <Avatar name={displayName} photoUrl={displayPhoto} size={88} />
            </View>

            <Text className="mt-3 text-[18px] font-bold" style={{ color: colors.ui.text }}>
              {displayName}
            </Text>
            {memberYear ? (
              <Text
                className="mt-0.5 text-[12px] font-normal"
                style={{ color: colors.ui.textMuted }}>
                Member since {memberYear}
              </Text>
            ) : null}

            <View className="mt-3">
              <Button
                label="Edit Profile"
                variant="tertiary"
                onPress={() => router.push('/profile/edit')}
                leftIcon={<Ionicons name="pencil" size={15} color={colors.primary['600']} />}
              />
            </View>
          </View>

          <MenuSection label="Account" colors={colors}>
            {ACCOUNT_ITEMS.map((item, i) => (
              <ProfileMenuRow
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => {
                  if (item.title === 'Edit Profile') {
                    router.push('/profile/edit');
                  } else if (item.title === 'Saved Addresses') {
                    router.push('/profile/addresses');
                  } else if (item.title === 'Payment Methods') {
                    router.push('/profile/payments');
                  }
                }}
                hideDivider={i === ACCOUNT_ITEMS.length - 1}
              />
            ))}
          </MenuSection>

          <MenuSection label="Preferences" colors={colors}>
            {PREFERENCES_ITEMS.map((item, i) => (
              <ProfileMenuRow
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={
                  item.title === 'Theme'
                    ? () => setThemeModalVisible(true)
                    : item.route
                      ? () => router.push(item.route as never)
                      : undefined
                }
                hideDivider={i === PREFERENCES_ITEMS.length - 1}
              />
            ))}
          </MenuSection>

          <MenuSection label="Support" colors={colors}>
            {SUPPORT_ITEMS.map((item, i) => (
              <ProfileMenuRow
                key={item.title}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                onPress={item.route ? () => router.push(item.route as never) : undefined}
                hideDivider={i === SUPPORT_ITEMS.length - 1}
              />
            ))}
          </MenuSection>

          <View className="mx-5 mt-3">
            <Pressable
              onPress={() => setLogoutModalVisible(true)}
              accessibilityLabel="Log out"
              android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
              className="flex-row items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3.5">
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text className="text-[14px] font-semibold text-red-500">Log Out</Text>
            </Pressable>
          </View>

          <Text
            className="mt-5 text-center text-[11px] font-normal"
            style={{ color: colors.ui.textLight }}>
            OKI v1.0.0
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title="Log Out">
        <Text className="mb-4 text-sm" style={{ color: colors.ui.textMuted }}>
          Are you sure you want to log out? You&apos;ll need to sign in again to access your
          bookings.
        </Text>
        <View className="gap-2.5">
          <Button
            label="Log Out"
            variant="danger"
            fullWidth
            loading={isLoggingOut}
            onPress={handleLogout}
          />
          <Button
            label="Cancel"
            variant="tertiary"
            fullWidth
            onPress={() => setLogoutModalVisible(false)}
          />
        </View>
      </Modal>

      <Modal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
        title="App Theme">
        <View className="gap-3">
          {(['crimson', 'teal', 'indigo'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setScheme(s);
                setThemeModalVisible(false);
              }}
              className="flex-row items-center justify-between rounded-xl border p-3"
              style={{
                borderColor: scheme === s ? colors.primary['500'] : colors.ui.border,
                backgroundColor: scheme === s ? `${colors.primary['500']}15` : colors.ui.surface,
              }}>
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    backgroundColor:
                      s === 'crimson' ? '#A82839' : s === 'teal' ? '#2D7A7A' : '#5D2E8C',
                  }}
                  className="h-4 w-4 rounded-full"
                />
                <Text className="text-[14px] font-semibold" style={{ color: colors.ui.text }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </View>
              {scheme === s && (
                <Ionicons name="checkmark" size={18} color={colors.primary['500']} />
              )}
            </Pressable>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MenuSection({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View className="mx-5 mt-5">
      <Text
        className="mb-2 text-[11px] font-semibold tracking-widest uppercase"
        style={{ color: colors.ui.textMuted }}>
        {label}
      </Text>
      <View
        className="overflow-hidden rounded-2xl border border-gray-100"
        style={{
          backgroundColor: colors.ui.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }}>
        {children}
      </View>
    </View>
  );
}
