import React from 'react';
import { View, Text } from 'react-native';
import { formatCurrency } from '../../utils';

interface PriceBreakdownProps {
  basePrice: number;
  tax: number;
  platformFee: number;
  discount?: number;
}

export function PriceBreakdown({ basePrice, tax, platformFee, discount = 0 }: PriceBreakdownProps) {
  const total = basePrice + tax + platformFee - discount;

  return (
    <View className="gap-2 rounded-2xl bg-gray-50 p-4">
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-gray-500">Base Price</Text>
        <Text className="text-[13px] font-medium text-gray-700">{formatCurrency(basePrice)}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-gray-500">Platform Fee</Text>
        <Text className="text-[13px] font-medium text-gray-700">{formatCurrency(platformFee)}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-gray-500">Estimated Tax</Text>
        <Text className="text-[13px] font-medium text-gray-700">{formatCurrency(tax)}</Text>
      </View>
      {discount > 0 && (
        <View className="flex-row justify-between">
          <Text className="text-[13px] text-green-600">Discount</Text>
          <Text className="text-[13px] font-medium text-green-600">-{formatCurrency(discount)}</Text>
        </View>
      )}
      <View className="my-1 h-px bg-gray-200" />
      <View className="flex-row justify-between">
        <Text className="text-sm font-bold text-gray-900">Total</Text>
        <Text className="text-primary-700 text-base font-bold">{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}
