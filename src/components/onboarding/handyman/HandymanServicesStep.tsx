import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Input } from '../../forms/Input';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../context/ThemeContext';
import { ServiceCategory } from '../../../types';
import { formatCurrency } from '../../../utils';
import { SERVICE_OPTIONS } from './shared';

interface ServicesStepProps {
  servicePricing: Partial<Record<ServiceCategory, string>>;
  onToggleService: (category: ServiceCategory) => void;
  onPriceChange: (category: ServiceCategory, value: string) => void;
}

export function HandymanServicesStep({
  servicePricing,
  onToggleService,
  onPriceChange,
}: ServicesStepProps) {
  const { colors } = useTheme();

  return (
    <View className="gap-3">
      <Card>
        <Text className="font-heading text-lg" style={{ color: colors.ui.text }}>
          Services and pricing
        </Text>
        <Text className="mt-1 text-[12px]" style={{ color: colors.ui.textMuted }}>
          Select every category you can handle and set your starting price so clients see the right expectations.
        </Text>
      </Card>

      {SERVICE_OPTIONS.map((service) => {
        const selected = servicePricing[service.category] !== undefined;
        const enteredPrice = servicePricing[service.category] ?? '';

        return (
          <Card key={service.category} className="gap-3">
            <Pressable
              onPress={() => onToggleService(service.category)}
              accessibilityLabel={`Toggle ${service.category}`}
              android_ripple={{ color: `${colors.primary['600']}14` }}
              style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
              className="flex-row items-start gap-3">
              <View
                className="h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: selected ? colors.primary['50'] : colors.ui.background }}>
                <Ionicons
                  name={service.icon}
                  size={20}
                  color={selected ? colors.primary['600'] : colors.ui.textMuted}
                />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold" style={{ color: colors.ui.text }}>
                      {service.category}
                    </Text>
                    <Text className="mt-1 text-[12px]" style={{ color: colors.ui.textMuted }}>
                      {service.hint}
                    </Text>
                  </View>
                  <Badge variant={selected ? 'success' : 'warning'} text={selected ? 'Selected' : 'Add'} />
                </View>
              </View>
            </Pressable>

            {selected ? (
              <View>
                <Input
                  label="Starting price"
                  placeholder="550"
                  keyboardType="number-pad"
                  fillColor={colors.ui.surface}
                  value={enteredPrice}
                  onChangeText={(value) => onPriceChange(service.category, value)}
                  leftIcon={
                    <Text style={{ color: colors.ui.textMuted }} className="text-[14px] font-semibold">
                      ₱
                    </Text>
                  }
                  helperText={
                    enteredPrice
                      ? `Shown to clients as ${formatCurrency(Number(enteredPrice), '₱')}`
                      : 'Set the lowest rate you are willing to accept.'
                  }
                />
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}