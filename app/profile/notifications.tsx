import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Button } from '../../src/components/ui/Button';

export default function NotificationSettings() {
  const { colors } = useTheme();
  const router = useRouter();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Notification Settings" showBack onBackPress={() => router.back()} />

      <View
        className="-mt-8 flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background }}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
          <View className="gap-6">
            <View
              className="flex-row items-center justify-between border-b py-3"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                  Push Notifications
                </Text>
                <Text className="mt-1 text-xs" style={{ color: colors.ui.textMuted }}>
                  Receive instant notifications for bookings, messages, and updates on your device.
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ true: colors.primary['600'] }}
              />
            </View>

            <View
              className="flex-row items-center justify-between border-b py-3"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                  Email Notifications
                </Text>
                <Text className="mt-1 text-xs" style={{ color: colors.ui.textMuted }}>
                  Receive copy of booking receipts, monthly statements, and account activity alerts.
                </Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ true: colors.primary['600'] }}
              />
            </View>

            <View
              className="flex-row items-center justify-between border-b py-3"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                  SMS Notifications
                </Text>
                <Text className="mt-1 text-xs" style={{ color: colors.ui.textMuted }}>
                  Receive text messages for booking reminders and emergency provider communications.
                </Text>
              </View>
              <Switch
                value={smsEnabled}
                onValueChange={setSmsEnabled}
                trackColor={{ true: colors.primary['600'] }}
              />
            </View>

            <View
              className="flex-row items-center justify-between border-b py-3"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                  Booking Updates
                </Text>
                <Text className="mt-1 text-xs" style={{ color: colors.ui.textMuted }}>
                  Alerts about booking status changes, arrivals, job starts, and completions.
                </Text>
              </View>
              <Switch
                value={bookingEnabled}
                onValueChange={setBookingEnabled}
                trackColor={{ true: colors.primary['600'] }}
              />
            </View>

            <View
              className="flex-row items-center justify-between border-b py-3"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.background }}>
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                  Promotional Alerts
                </Text>
                <Text className="mt-1 text-xs" style={{ color: colors.ui.textMuted }}>
                  Stay updated on seasonal discounts, promos, and new service category offerings.
                </Text>
              </View>
              <Switch
                value={promoEnabled}
                onValueChange={setPromoEnabled}
                trackColor={{ true: colors.primary['600'] }}
              />
            </View>
          </View>
        </ScrollView>

        <View
          className="border-t p-5"
          style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
          <Button label="Save Preferences" onPress={() => router.back()} fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}
