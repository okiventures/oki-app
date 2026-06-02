import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PromoData } from '../../mocks/dashboard';
import { useTheme } from '../../context/ThemeContext';

interface PromoCardProps {
  promo: PromoData;
  onClaimPress?: () => void;
}

export function PromoCard({ promo, onClaimPress }: PromoCardProps) {
  const { colors } = useTheme();

  return (
    <View className="mx-5 mb-5">
      <View
        className="flex-row items-center overflow-hidden rounded-xl"
        style={{
          backgroundColor: colors.ui.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
          borderWidth: 1,
          borderColor: colors.secondary['200'],
        }}>
        {/* Icon band */}
        <View
          className="w-[52px] items-center justify-center self-stretch border-r"
          style={{
            backgroundColor: colors.secondary['50'],
            borderRightColor: colors.secondary['200'],
          }}>
          <Ionicons name="ticket-outline" size={22} color={colors.secondary['600']} />
        </View>

        {/* Promo details */}
        <View className="flex-1 px-3 py-2.5">
          <Text
            className="text-[13px] font-medium"
            style={{ color: colors.ui.text }}
            numberOfLines={1}>
            {promo.description}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <View
              className="rounded-md border px-1.5 py-0.5"
              style={{
                backgroundColor: colors.secondary['50'],
                borderColor: colors.secondary['200'],
              }}>
              <Text
                className="text-xs font-semibold tracking-wide"
                style={{ color: colors.secondary['600'] }}>
                {promo.code}
              </Text>
            </View>
            <Text className="text-xs font-normal" style={{ color: colors.ui.textLight }}>
              {promo.expiresLabel}
            </Text>
          </View>
        </View>

        {/* Claim button */}
        <TouchableOpacity
          onPress={onClaimPress}
          accessibilityLabel={`Claim promo code ${promo.code}`}
          className="mr-3 rounded-full border px-3 py-1.5"
          style={{
            backgroundColor: colors.secondary['50'],
            borderColor: colors.secondary['200'],
          }}>
          <Text
            className="text-xs font-semibold"
            style={{ color: colors.secondary['600'] }}>
            Claim
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
