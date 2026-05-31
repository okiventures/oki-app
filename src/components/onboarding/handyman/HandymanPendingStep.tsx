import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../context/ThemeContext';
import { ServiceCategory } from '../../../types';
import { formatCurrency } from '../../../utils';

interface PendingStepProps {
  selectedServices: { category: ServiceCategory }[];
  servicePricing: Partial<Record<ServiceCategory, string>>;
}

export function HandymanPendingStep({ selectedServices, servicePricing }: PendingStepProps) {
  const { colors } = useTheme();

  return (
    <View className="gap-3">
      <Card className="items-center gap-3 py-6">
        <View
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primary['50'] }}>
          <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary['600']} />
        </View>
        <Badge variant="warning" text="Pending Verification" />
        <Text className="font-heading text-center text-xl" style={{ color: colors.ui.text }}>
          Your application is under review
        </Text>
        <Text className="text-center text-[13px] leading-5" style={{ color: colors.ui.textMuted }}>
          We received your profile, service pricing, and KYC documents. Admin review usually takes less than 24 hours.
        </Text>
      </Card>

      <Card>
        <Text className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: colors.ui.textMuted }}>
          Services submitted
        </Text>
        <View className="mt-3 gap-2">
          {selectedServices.map((service) => (
            <View key={service.category} className="flex-row items-center justify-between rounded-2xl bg-gray-50 px-3 py-3">
              <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                {service.category}
              </Text>
              <Text className="text-[13px] font-semibold" style={{ color: colors.primary['600'] }}>
                {formatCurrency(Number(servicePricing[service.category] ?? 0), '₱')}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: colors.ui.textMuted }}>
          Next steps
        </Text>
        <View className="mt-3 gap-3">
          <PendingStepRow label="Application submitted" detail="Profile and document set saved to the review queue." />
          <PendingStepRow label="Admin verification" detail="Identity and service coverage are checked manually." />
          <PendingStepRow label="Account activation" detail="You can start accepting jobs once your badge switches to Approved." />
        </View>
      </Card>
    </View>
  );
}

function PendingStepRow({ label, detail }: { label: string; detail: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-gray-900">{label}</Text>
        <Text className="mt-1 text-[12px] text-gray-500">{detail}</Text>
      </View>
    </View>
  );
}