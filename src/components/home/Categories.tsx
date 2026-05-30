import React from 'react';
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MOCK_CATEGORIES } from '../../mocks';
export default function Categories() {
  const router = useRouter();
  return (
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
          <Text className="text-center text-xs font-semibold text-gray-700">{cat.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
