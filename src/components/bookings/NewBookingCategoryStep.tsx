import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { NEW_BOOKING_CATEGORIES } from './NewBookingConstants';
import type { BookableCategoryId } from '../../constants/bookableCategories';
import type { BookableService } from '../../services/catalogService';

interface CategoryStepProps {
  selected: BookableCategoryId | null;
  selectedSubService: string | null;
  /** Catalog-priced sub-services for the selected category. */
  subServices: BookableService[];
  isLoadingServices?: boolean;
  servicesError?: string | null;
  onRetryServices?: () => void;
  onSelect: (id: BookableCategoryId) => void;
  onSelectSubService: (id: string) => void;
}

export function NewBookingCategoryStep({
  selected,
  selectedSubService,
  subServices,
  isLoadingServices = false,
  servicesError = null,
  onRetryServices,
  onSelect,
  onSelectSubService,
}: CategoryStepProps) {
  const { colors } = useTheme();

  const activeCat = NEW_BOOKING_CATEGORIES.find((c) => c.id === selected) ?? null;

  return (
    <View className="flex-1">
      <Text className="mb-1 text-[22px] font-bold" style={{ color: colors.ui.text }}>
        What do you need help with?
      </Text>
      <Text className="mb-5 text-sm" style={{ color: colors.ui.textMuted }}>
        Select a service category to get started.
      </Text>

      <View className="mb-5 flex-row flex-wrap gap-3">
        {NEW_BOOKING_CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                onSelect(cat.id);
                onSelectSubService('');
              }}
              activeOpacity={0.8}
              className="mb-1 overflow-hidden rounded-2xl"
              style={{
                width: '46%',
                backgroundColor: cat.color,
                shadowColor: cat.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isSelected ? 0.3 : 0.1,
                shadowRadius: 8,
                elevation: isSelected ? 4 : 1,
                transform: [{ scale: isSelected ? 1.04 : 1 }],
              }}>
              <Ionicons
                name={cat.icon as never}
                size={90}
                color="#FFFFFF"
                style={{ position: 'absolute', right: -20, top: -5, opacity: 0.15 }}
              />
              {isSelected && (
                <View className="absolute top-3 right-3 z-10 h-6 w-6 items-center justify-center rounded-full bg-white">
                  <Ionicons name="checkmark" size={16} color={cat.color} />
                </View>
              )}
              <View className="min-h-[90px] justify-end p-4 pt-5">
                <Text className="text-[17px] font-semibold text-white" numberOfLines={2}>
                  {cat.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeCat && (
        <View>
          <View className="mb-3 flex-row items-center gap-2">
            <View className="h-px flex-1" style={{ backgroundColor: colors.ui.border }} />
            <Text className="text-xs font-bold" style={{ color: colors.ui.textMuted }}>
              Choose a service
            </Text>
            <View className="h-px flex-1" style={{ backgroundColor: colors.ui.border }} />
          </View>

          {isLoadingServices ? (
            <Text className="py-3 text-[13px]" style={{ color: colors.ui.textMuted }}>
              Loading prices…
            </Text>
          ) : servicesError ? (
            <View className="py-3">
              <Text className="text-[13px]" style={{ color: '#EF4444' }}>
                {servicesError}
              </Text>
              {onRetryServices ? (
                <Pressable
                  onPress={onRetryServices}
                  accessibilityRole="button"
                  accessibilityLabel="Try loading prices again"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  className="mt-2 self-start rounded-lg px-3 py-2"
                  android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: colors.primary['600'] }}>
                    Try again
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : subServices.length === 0 ? (
            <Text className="py-3 text-[13px]" style={{ color: colors.ui.textMuted }}>
              Nothing bookable in this category yet.
            </Text>
          ) : (
            <View className="gap-2">
              {subServices.map((svc) => {
                const isSelected = selectedSubService === svc.slug;
                return (
                  <TouchableOpacity
                    key={svc.slug}
                    onPress={() => onSelectSubService(svc.slug)}
                    activeOpacity={0.75}
                    className="flex-row items-center rounded-2xl border px-4 py-3.5"
                    style={{
                      borderColor: isSelected ? activeCat.color : colors.ui.border,
                      backgroundColor: isSelected ? activeCat.color + '12' : colors.ui.surface,
                      borderWidth: isSelected ? 1.5 : 1,
                    }}>
                    <View className="flex-1">
                      <Text
                        className="text-[14px] font-semibold"
                        style={{ color: isSelected ? activeCat.color : colors.ui.text }}>
                        {svc.name}
                      </Text>
                      <Text className="mt-0.5 text-[12px]" style={{ color: colors.ui.textMuted }}>
                        {svc.description}
                      </Text>
                    </View>
                    <View className="ml-3 items-end">
                      <Text
                        className="text-[11px] font-medium"
                        style={{ color: colors.ui.textMuted }}>
                        Price
                      </Text>
                      <Text
                        className="text-[15px] font-bold"
                        style={{ color: isSelected ? activeCat.color : colors.ui.text }}>
                        ₱{svc.price}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="ml-3">
                        <Ionicons name="checkmark-circle" size={20} color={activeCat.color} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
