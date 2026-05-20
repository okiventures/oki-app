import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Form } from '../../src/components/forms/Form';
import { Input } from '../../src/components/forms/Input';
import { Button } from '../../src/components/ui/Button';
import { useTheme } from '../../src/context/ThemeContext';

const SERVICE_NEEDS = ['Home Repair', 'Cleaning', 'Plumbing', 'Electrical', 'Appliance'];

export default function ClientOnboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [selectedNeed, setSelectedNeed] = useState(SERVICE_NEEDS[0]);

  const canContinue = useMemo(
    () => fullName.trim().length > 1 && phone.trim().length > 6 && location.trim().length > 2,
    [fullName, phone, location]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 20, height: '100%'}}>
        <View className="mb-4">
          <Badge variant="primary" text="Step 1 of 2" />
          <Text className="font-heading mt-2 text-xl text-gray-900">Tell us about you</Text>
          <Text className="mt-1 text-[13px] text-gray-500">
            We use this to personalize your home services experience.
          </Text>
        </View>

        <View className="mb-4">
          <Form gap={3}>
            <Input
              label="Full name"
              placeholder="Juan Dela Cruz"
              value={fullName}
              fillColor='#FFFFFF'
              onChangeText={setFullName}
              leftIcon={<Ionicons name="person-outline" size={18} color="#9CA3AF" />}
            />
            <Input
              label="Mobile number"
              placeholder="09xx xxx xxxx"
              value={phone}
              fillColor='#FFFFFF'
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={18} color="#9CA3AF" />}
            />
            <Input
              label="City or barangay"
              placeholder="Cebu City"
              value={location}
              fillColor='#FFFFFF'
              onChangeText={setLocation}
              leftIcon={<Ionicons name="location-outline" size={18} color="#9CA3AF" />}
            />
          </Form>
        </View>

        <View>
          <Text className="font-heading text-base text-gray-900">Top service need</Text>
          <Text className="mt-1 text-[12px] text-gray-500">
            Pick what you usually need so we can tailor recommendations.
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {SERVICE_NEEDS.map((need) => {
              const isActive = selectedNeed === need;
              return (
                <TouchableOpacity
                  key={need}
                  onPress={() => setSelectedNeed(need)}
                  style={{
                    borderColor: isActive ? colors.primary['500'] : '#E5E7EB',
                    backgroundColor: isActive ? colors.primary['50'] : '#FFFFFF',
                  }}
                  className="rounded-full border px-4 py-2">
                  <Text
                    style={{ color: isActive ? colors.primary['700'] : '#374151' }}
                    className="text-[12px] font-semibold">
                    {need}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4">
        <Button
        label="Continue to KYC-lite"
        onPress={() => router.replace('/(client)/kyc-lite')}
        fullWidth
        disabled={!canContinue}
        />
      </View>
    </SafeAreaView>
  );
}
