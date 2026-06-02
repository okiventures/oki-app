import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { Avatar } from '../../src/components/ui/Avatar';
import { Input } from '../../src/components/ui/Input';
import { MOCK_CLIENT } from '../../src/mocks';

export default function EditProfile() {
  const { colors } = useTheme();
  const router = useRouter();

  const [name, setName] = useState(MOCK_CLIENT.name);
  const [email, setEmail] = useState('ceferino.v@example.com');
  const [phone, setPhone] = useState('+1 (555) 123-4567');

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1"
      style={{ backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Edit Profile" showBack onBackPress={() => router.back()} />
      <View
        className="-mt-8 flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
            <View className="mb-8 items-center">
              <View className="relative">
                <Avatar name={name} photoUrl={MOCK_CLIENT.photoUrl} size={100} />
                <Pressable
                  className="absolute right-0 bottom-0 rounded-full border-[3px] p-2"
                  style={{
                    backgroundColor: colors.primary['500'],
                    borderColor: colors.ui.background,
                  }}>
                  <Ionicons name="camera" size={18} color="#FFF" />
                </Pressable>
              </View>
            </View>

            <View className="gap-5">
              <Input label="Full Name" value={name} onChangeText={setName} />
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>
          <View
            className="border-t p-5"
            style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
            <Button label="Save Changes" onPress={() => router.back()} fullWidth />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
