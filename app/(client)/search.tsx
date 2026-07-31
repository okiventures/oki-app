import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../src/context/ThemeContext';
import { useHandymanSearch } from '../../src/hooks/useHandymanSearch';
import { ServiceCategory } from '../../src/types';
import { Avatar } from '../../src/components/ui/Avatar';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { formatCurrency } from '../../src/utils';
import { MOCK_HANDYMEN } from '../../src/mocks';
import { isMockEnv } from '../../src/services/bookingService';

const DEFAULT_LAT = 10.3157;
const DEFAULT_LNG = 123.8854;

const CATEGORY_PARAM_MAP: Record<string, ServiceCategory> = {
  massage: ServiceCategory.General,
  cleaning: ServiceCategory.Cleaning,
  painting: ServiceCategory.Painting,
  electrical: ServiceCategory.Electrical,
  plumbing: ServiceCategory.Plumbing,
  carpentry: ServiceCategory.Carpentry,
  hvac: ServiceCategory.HVAC,
  roofing: ServiceCategory.Roofing,
  landscaping: ServiceCategory.Landscaping,
  appliance: ServiceCategory.Appliance,
  general: ServiceCategory.General,
};

const HANDYMAN_PROFILE_MAP = isMockEnv() ? new Map(MOCK_HANDYMEN.map((h) => [h.id, h])) : null;

export default function SearchResults() {
  const { colors } = useTheme();
  const router = useRouter();
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch {
        // fall back to default coords
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const category = CATEGORY_PARAM_MAP[categoryParam ?? ''] ?? null;

  const { handymen, isLoading } = useHandymanSearch({
    latitude: coords?.latitude ?? DEFAULT_LAT,
    longitude: coords?.longitude ?? DEFAULT_LNG,
    radiusMeters: 10000,
    category,
  });

  const categoryLabel = useMemo(() => {
    if (!categoryParam) return 'All Services';
    return categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
  }, [categoryParam]);

  const handleSelect = useCallback(
    (handyman: (typeof handymen)[number]) => {
      router.push(`/new-booking?handymanId=${handyman.handyman_id}`);
    },
    [router]
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <View className="px-5 pt-3 pb-5">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            className="p-1">
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.95)" />
          </Pressable>
          <Text className="flex-1 text-[16px] font-semibold text-white">{categoryLabel}</Text>
        </View>
      </View>

      <View
        className="flex-1 rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -8 }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <LoadingSpinner />
          </View>
        ) : handymen.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No handymen found"
            message="Try a different category or expand your search area."
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}>
            <Text className="mb-3 text-[13px] font-medium text-gray-500">
              {handymen.length} handyman{handymen.length === 1 ? '' : 'men'} available — sorted by
              distance
            </Text>

            {handymen.map((hm) => {
              const profile = HANDYMAN_PROFILE_MAP?.get(hm.handyman_id) ?? null;

              return (
                <Pressable
                  key={hm.handyman_id}
                  onPress={() => handleSelect(hm)}
                  android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                  <Card className="mb-3">
                    <View className="flex-row items-start gap-3">
                      <Avatar name={hm.user_name} photoUrl={hm.photo_url ?? undefined} size={52} />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="flex-1 text-[15px] font-semibold text-gray-900">
                            {hm.user_name}
                          </Text>
                          {hm.is_online && <View className="h-2 w-2 rounded-full bg-green-500" />}
                        </View>

                        <View className="mt-1 flex-row items-center gap-3">
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="star" size={12} color="#EAB308" />
                            <Text className="text-[12px] font-medium text-gray-700">
                              {hm.trust_score?.toFixed(1) ?? '—'}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                            <Text className="text-[12px] text-gray-500">
                              {(hm.distance_meters / 1000).toFixed(1)} km
                            </Text>
                          </View>
                        </View>

                        <View className="mt-2 flex-row flex-wrap gap-1.5">
                          {profile?.skills.slice(0, 3).map((s: string) => (
                            <Badge key={s} text={s} variant="primary" />
                          ))}
                        </View>

                        <View className="mt-1.5">
                          <Text className="text-primary-600 text-[12px] font-medium">
                            {profile ? formatCurrency(profile.hourlyRate) + '/hr' : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
