import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../src/context/ThemeContext';
import { useHandymanSearch } from '../../src/hooks/useHandymanSearch';
import { findBookableCategory } from '../../src/constants/bookableCategories';
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

const HANDYMAN_PROFILE_MAP = isMockEnv() ? new Map(MOCK_HANDYMEN.map((h) => [h.id, h])) : null;

export default function SearchResults() {
  const { colors } = useTheme();
  const router = useRouter();
  const { category: categoryParam } = useLocalSearchParams<{ category: string }>();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const position = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ]);
        if (!cancelled) {
          setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch {
        // fall back to default coords
      } finally {
        if (!cancelled) setLocationReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A param that isn't a bookable id means a stale link — search everything
  // rather than pretending to filter. The old hand-maintained map keyed on
  // single words (`appliance`, `general`) while the tiles are hyphenated
  // (`appliance-repair`), so those two silently fell through to unfiltered
  // results that looked filtered.
  const bookableCategory = findBookableCategory(categoryParam);
  const category = bookableCategory?.serviceCategory ?? null;

  const { handymen, isLoading, error, refetch } = useHandymanSearch({
    latitude: locationReady ? (coords?.latitude ?? DEFAULT_LAT) : null,
    longitude: locationReady ? (coords?.longitude ?? DEFAULT_LNG) : null,
    radiusMeters: 10000,
    category,
  });

  // Titled from the category itself, not the raw param — that rendered the
  // hyphenated route id back at the user as "Appliance-repair".
  const categoryLabel = useMemo(
    () => bookableCategory?.name ?? 'All Services',
    [bookableCategory?.name]
  );

  const handleSelect = useCallback(
    (handyman: (typeof handymen)[number]) => {
      // The booking form has no way to look a handyman up — there is no public
      // handyman profile endpoint on the client yet — so the display name rides
      // along with the id. Params are in-memory here, not a real URL.
      const params = new URLSearchParams({ handymanId: handyman.handyman_id });
      // Only when there is a name to carry — URLSearchParams stringifies a
      // missing value, which would render the banner as "Requested: undefined".
      if (handyman.user_name) params.set('handymanName', handyman.user_name);
      if (bookableCategory) params.set('category', bookableCategory.id);

      router.push(`/new-booking?${params.toString()}`);
    },
    [router, bookableCategory]
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
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <EmptyState icon="cloud-offline-outline" title="Search failed" message={error} />
            <Pressable
              onPress={refetch}
              android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
              className="bg-primary-600 mt-4 rounded-xl px-6 py-3">
              <Text className="text-[14px] font-semibold text-white">Try again</Text>
            </Pressable>
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
            {locationReady && !coords && (
              <Text className="-mt-2 mb-3 text-[12px] text-gray-400">
                Location unavailable — showing results near Cebu City.
              </Text>
            )}

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
                            <Text className="text-[12px] text-gray-400">
                              ({hm.review_count} review{hm.review_count === 1 ? '' : 's'})
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
