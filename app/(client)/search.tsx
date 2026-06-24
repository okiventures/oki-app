import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { Avatar } from '../../src/components/ui/Avatar';
import { Badge } from '../../src/components/ui/Badge';
import { Card } from '../../src/components/ui/Card';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { MOCK_HANDYMAN_SEARCH_RESULTS } from '../../src/mocks';
import { formatCurrency } from '../../src/utils';

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Painting', 'HVAC'];

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Card className="mb-3 flex-row items-center gap-3">
        <View className="h-12 w-12 rounded-full bg-gray-200" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-32 rounded bg-gray-200" />
          <View className="h-2.5 w-20 rounded bg-gray-100" />
          <View className="h-2.5 w-24 rounded bg-gray-100" />
        </View>
        <View className="h-8 w-20 rounded-xl bg-gray-200" />
      </Card>
    </Animated.View>
  );
}

export default function ClientSearch() {
  const { colors } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const filteredResults = useMemo(() => {
    return MOCK_HANDYMAN_SEARCH_RESULTS.filter((h) => {
      const matchesSearch =
        !searchText ||
        h.name.toLowerCase().includes(searchText.toLowerCase()) ||
        h.serviceCategories.some((c) => c.toLowerCase().includes(searchText.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' ||
        h.serviceCategories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()));

      return matchesSearch && matchesCategory;
    });
  }, [searchText, selectedCategory]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Find a Handyman" showNotifications />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.ui.background }}>
          <View className="px-5 pt-5 pb-3">
            <SearchBar
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search handymen or services…"
              accessibilityLabel="Search handymen"
            />
          </View>

          {/* Category filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                accessibilityLabel={`Filter by ${cat}`}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: selectedCategory === cat ? colors.primary['600'] : colors.primary['50'],
                }}>
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: selectedCategory === cat ? '#fff' : colors.primary['700'] }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="mt-4 px-5">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : filteredResults.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="No handymen found"
                message={
                  searchText
                    ? `No results for "${searchText}". Try a different name or category.`
                    : 'No handymen available for this category. Try another service.'
                }
              />
            ) : (
              <>
                <Text className="mb-3 text-[12px] font-medium text-gray-400">
                  {filteredResults.length} handyman{filteredResults.length !== 1 ? 's' : ''} nearby
                </Text>
                {filteredResults.map((handyman) => (
                  <Card key={handyman.id} className="mb-3 flex-row items-center gap-3">
                    <Avatar name={handyman.name} photoUrl={handyman.photoUrl} size={48} />

                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[15px] font-bold text-gray-900">{handyman.name}</Text>
                        <Badge
                          variant={handyman.isOnline ? 'online' : 'offline'}
                          text={handyman.isOnline ? 'Online' : 'Offline'}
                        />
                      </View>

                      <View className="mt-0.5 flex-row items-center gap-1">
                        <Ionicons name="star" size={12} color="#EAB308" />
                        <Text className="text-[12px] font-semibold text-gray-700">{handyman.rating.toFixed(1)}</Text>
                        <Text className="text-[12px] text-gray-400">({handyman.reviewCount})</Text>
                        <Text className="text-[12px] text-gray-300">·</Text>
                        <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                        <Text className="text-[12px] text-gray-400">{handyman.distanceKm} km</Text>
                      </View>

                      <View className="mt-1 flex-row flex-wrap gap-1">
                        {handyman.serviceCategories.map((cat) => (
                          <View key={cat} className="rounded-full bg-gray-100 px-2 py-0.5">
                            <Text className="text-[10px] font-medium text-gray-600">{cat}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View className="items-end gap-1">
                      <Text className="text-[13px] font-bold text-gray-900">{formatCurrency(handyman.hourlyRate)}</Text>
                      <Text className="text-[10px] text-gray-400">/hr</Text>
                    </View>
                  </Card>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
