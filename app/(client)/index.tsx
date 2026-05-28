import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../src/components/ui/Avatar';
import { SearchBar } from '../../src/components/forms/SearchBar';
import { Card } from '../../src/components/ui/Card';
import { MOCK_CLIENT, MOCK_CATEGORIES, MOCK_POPULAR_SERVICES } from '../../src/mocks';
import { useTheme } from '../../src/context/ThemeContext';
import { ColorScheme } from '../../src/types';
import { COLOR_SCHEMES } from '../../src/constants/theme';

export default function ClientHome() {
  const router = useRouter();
  const { scheme, setScheme, colors } = useTheme();
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredPopular = MOCK_POPULAR_SERVICES.filter((s) =>
    s.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-5 pt-10 pb-3">
        <View className="flex-1">
          <Text className="text-[13px] font-medium text-gray-500">Current Location</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="location-sharp" size={16} color={colors.primary['600']} />
            <Text className="text-[15px] font-bold text-gray-900">{MOCK_CLIENT.location}</Text>
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </View>
        </View>
        <Avatar name={MOCK_CLIENT.name} photoUrl={MOCK_CLIENT.photoUrl} size={32} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="mb-4 px-5">
          <Text className="font-heading mb-3 text-xl text-gray-900">
            What do you need help with?
          </Text>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search for a service..."
            onFilterPress={() => setShowFilters((s) => !s)}
          />

          {showFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 10 }}>
              {MOCK_CATEGORIES.map((cat, index) => (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => {
                    setSearchText(cat.name);
                    setShowFilters(false);
                    router.push(`/(client)/search?category=${encodeURIComponent(cat.name)}`);
                  }}
                  className={`px-3 py-1 rounded-full bg-gray-200 ${index < MOCK_CATEGORIES.length - 1 ? 'mr-2' : ''}`}>
                  <Text className="text-sm text-gray-800">{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-5">
          <View className="mb-3 flex-row items-center justify-between px-5">
            <Text className="font-heading text-base text-gray-900">Categories</Text>
            <TouchableOpacity>
              <Text style={{ color: colors.primary['600'] }} className="text-[13px] font-semibold">
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            {MOCK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                className="w-16 items-center"
                onPress={() => router.push(`/(client)/search?category=${cat.name}`)}>
                <View
                  style={{ backgroundColor: cat.bg }}
                  className="mb-2 h-12 w-12 items-center justify-center rounded-xl">
                  <Ionicons name={cat.icon as never} size={24} color={cat.color} />
                </View>
                <Text className="text-center text-[11px] font-semibold text-gray-700">
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="mb-5 px-5">
          <Text className="font-heading mb-2 text-base text-gray-900">Popular Right Now</Text>

          {searchText ? (
            <View>
              <Text className="mb-2 text-sm text-gray-600">Results for {searchText}</Text>
              <FlatList
                data={filteredPopular}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => router.push(`/(client)/search?service=${encodeURIComponent(item.title)}`)}>
                    <Card className="p-3 mr-2">
                      <Ionicons name={item.icon as never} size={24} color={item.color} className="mb-2" />
                      <Text className="text-sm font-bold text-gray-900">{item.title}</Text>
                      <Text className="mt-1 text-[11px] text-gray-500">Fix from ₱{item.price}</Text>
                    </Card>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : (
            <View className="flex-row gap-3">
              {MOCK_POPULAR_SERVICES.map((service) => (
                <Card key={service.id} className="flex-1 p-3">
                  <Ionicons
                    name={service.icon as never}
                    size={24}
                    color={service.color}
                    className="mb-2"
                  />
                  <Text className="text-sm font-bold text-gray-900">{service.title}</Text>
                  <Text className="mt-1 text-[11px] text-gray-500">Fix from ₱{service.price}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>

        <View className="px-5">
          <Text className="font-heading mb-2 text-base text-gray-900">Recent Activity</Text>
          <Card>
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                <Ionicons name="hammer-outline" size={18} color="#4F46E5" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-gray-900">Plumbing Service</Text>
                <Text className="mt-0.5 text-[11px] text-gray-500">
                  Ceferino Jumaoas is working...
                </Text>
              </View>
              <TouchableOpacity className="bg-primary-600 rounded-full px-3 py-2">
                <Text className="text-[11px] font-bold text-white">View</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
