import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Avatar } from '../../src/components/ui/Avatar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_HANDYMAN, MOCK_HANDYMAN_WALLET } from '../../src/mocks';
import { Link } from 'expo-router';
import { WalletSection } from '../../src/components/handyman/WalletSection';
import { Modal } from '../../src/components/ui/Modal';
import { Button } from '../../src/components/ui/Button';

export default function HandymanProfile() {
  const { colors } = useTheme();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.primary['600'] }}>
        <ScreenHeader title="Worker Profile" />

        <View
          className="flex-1 rounded-t-[32px] pb-9 px-4"
          style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
          
          <View className="items-center" style={{ marginTop: -40 }}>
            <View
              className="rounded-full border-4 border-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 6,
              }}>
              <Avatar name={MOCK_HANDYMAN.name} photoUrl={MOCK_HANDYMAN.photoUrl} size={80} />
            </View>
            <Text className="font-heading mt-3 text-lg text-gray-900">{MOCK_HANDYMAN.name}</Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="star" size={14} color="#EAB308" />
              <Text className="text-[13px] font-bold text-gray-700">{MOCK_HANDYMAN.rating}</Text>
              <Text className="text-[13px] text-gray-500">({MOCK_HANDYMAN.reviewCount} reviews)</Text>
            </View>
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {MOCK_HANDYMAN.skills.map((skill) => (
                <Badge key={skill} text={skill} variant="primary" />
              ))}
            </View>
          </View>

          <View className="mt-6">
            <WalletSection wallet={MOCK_HANDYMAN_WALLET} />
          </View>

          <Card className="p-0 overflow-hidden mt-4">
            <Link href="/(handyman)/past-jobs" asChild>
              <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
                <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary['50'] }}>
                  <Ionicons name="albums-outline" size={18} color={colors.primary['600']} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-[15px] font-bold text-gray-900">Past Jobs</Text>
                  <Text className="text-[11px] text-gray-500 mt-0.5">Your Previous Jobs</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </Link>

            <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary['50'] }}>
                <Ionicons name="settings-outline" size={18} color={colors.primary['600']} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Settings</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">App preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center p-4">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primary['50'] }}>
                <Ionicons name="help-buoy-outline" size={18} color={colors.primary['600']} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Help & Support</Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">Contact Oki Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>

          <View className="mx-5 mt-8 mb-3">
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
