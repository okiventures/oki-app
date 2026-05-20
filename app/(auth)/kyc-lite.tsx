import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Navbar } from '../../src/components/navigation/Navbar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { useTheme } from '../../src/context/ThemeContext';

type KycItem = {
  id: 'id' | 'selfie' | 'address';
  title: string;
  subtitle: string;
  icon: string;
};

const KYC_ITEMS: KycItem[] = [
  {
    id: 'id',
    title: 'Government ID',
    subtitle: 'Any valid ID with your name and photo.',
    icon: 'card-outline',
  },
  {
    id: 'selfie',
    title: 'Selfie check',
    subtitle: 'A quick selfie to match your ID.',
    icon: 'camera-outline',
  },
  {
    id: 'address',
    title: 'Proof of address',
    subtitle: 'Recent bill or delivery note.',
    icon: 'home-outline',
  },
];

export default function ClientKycLite() {
  const router = useRouter();
  const { colors } = useTheme();
  const [completed, setCompleted] = useState<Record<KycItem['id'], boolean>>({
    id: false,
    selfie: false,
    address: false,
  });

  const allDone = useMemo(
    () => Object.values(completed).every(Boolean),
    [completed]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Navbar showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View className="mb-4">
          <Badge variant="primary" text="Step 2 of 2" />
          <Text className="font-heading mt-2 text-xl text-gray-900">Verify quickly</Text>
          <Text className="mt-1 text-[13px] text-gray-500">
            Lightweight verification to keep the platform safe.
          </Text>
        </View>

        {KYC_ITEMS.map((item) => {
          const isDone = completed[item.id];
          return (
            <Card key={item.id} className="mb-3">
              <View className="flex-row items-start gap-3">
                <View
                  style={{ backgroundColor: isDone ? '#DCFCE7' : colors.primary['50'] }}
                  className="h-11 w-11 items-center justify-center rounded-xl">
                  <Ionicons
                    name={item.icon as never}
                    size={20}
                    color={isDone ? '#15803D' : colors.primary['600']}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-gray-900">{item.title}</Text>
                  <Text className="mt-1 text-[12px] text-gray-500">{item.subtitle}</Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Badge variant={isDone ? 'success' : 'warning'} text={isDone ? 'Done' : 'Pending'} />
                    <TouchableOpacity
                      onPress={() =>
                        setCompleted((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="flex-row items-center gap-1">
                      <Text
                        style={{ color: colors.primary['600'] }}
                        className="text-[12px] font-semibold">
                        {isDone ? 'Change' : 'Upload'}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.primary['600']} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <View className="absolute bottom-16 left-0 right-0 p-4">
        <Button
          label="Finish and go to Home"
          onPress={() => router.replace('/(client)')}
          fullWidth
          disabled={!allDone}
        />
        <Text className="mt-2 text-center text-[11px] text-gray-400">
          You can edit these later from your profile.
        </Text>
      </View>
    </View>
  );
}
