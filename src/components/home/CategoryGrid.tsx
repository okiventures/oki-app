import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardCategory } from '../../mocks/dashboard';
import { useTheme } from '../../context/ThemeContext';

interface CategoryGridProps {
  categories: DashboardCategory[];
  onCategoryPress?: (category: DashboardCategory) => void;
}

export function CategoryGrid({ categories, onCategoryPress }: CategoryGridProps) {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const handlePress = (cat: DashboardCategory) => {
    setSelectedId((prev) => (prev === cat.id ? null : cat.id));
    onCategoryPress?.(cat);
  };

  return (
    <View className="mx-5 mb-5">
      <Text
        className="mb-2.5 text-sm font-medium"
        style={{ color: colors.ui.text }}>
        Services
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {categories.map((cat) => {
          const isSelected = selectedId === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handlePress(cat)}
              accessibilityLabel={cat.name}
              accessibilityState={{ selected: isSelected }}
              className="items-center justify-center gap-1 rounded-xl"
              style={{
                width: '23%',
                maxWidth: 85,
                aspectRatio: 1,
                backgroundColor: cat.bgColor,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 3,
                elevation: 2,
              }}>
              <View className="items-center justify-center">
                <Ionicons name={cat.icon as never} size={20} color={cat.iconColor} />
              </View>
              <Text
                className="text-center text-xs font-normal"
                style={{ color: colors.ui.text }}
                numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
