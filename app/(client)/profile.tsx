import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Avatar } from '../../src/components/ui/Avatar';
import { Modal } from '../../src/components/ui/Modal';
import { Button } from '../../src/components/ui/Button';
import { ProfileMenuRow } from '../../src/components/profile/ProfileMenuRow';
import { MOCK_CLIENT } from '../../src/mocks';

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

const PREFERENCES_ITEMS = [
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    subtitle: 'Push, email, and SMS alerts',
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
  },
];

const SUPPORT_ITEMS = [
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
  const { colors } = useTheme();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const memberYear = new Date(MOCK_CLIENT.memberSince).getFullYear();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.primary['600'] }}>
        <ScreenHeader
          title="My Profile"
          showSettings
          showNotifications
          onSettingsPress={() => {}}
          onNotificationsPress={() => {}}
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
              <Avatar name={MOCK_CLIENT.name} photoUrl={MOCK_CLIENT.photoUrl} size={88} />
            </View>

            <Text className="mt-3 text-[18px] font-bold" style={{ color: colors.ui.text }}>
              {MOCK_CLIENT.name}
            </Text>
            <Text className="mt-0.5 text-[12px] font-normal" style={{ color: colors.ui.textMuted }}>
              {MOCK_CLIENT.location} · Member since {memberYear}
            </Text>

            <View className="mt-3">
              <Button
                label="Edit Profile"
                variant="tertiary"
                onPress={() => {}}
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
                onPress={() => {}}
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
                onPress={() => {}}
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
                onPress={() => {}}
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
        <Text className="mb-4 text-sm" style={{ color: '#6B7280' }}>
          Are you sure you want to log out? You&apos;ll need to sign in again to access your bookings.
        </Text>
        <View className="gap-2.5">
          <Button
            label="Log Out"
            variant="danger"
            fullWidth
            onPress={() => setLogoutModalVisible(false)}
          />
          <Button
            label="Cancel"
            variant="tertiary"
            fullWidth
            onPress={() => setLogoutModalVisible(false)}
          />
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
