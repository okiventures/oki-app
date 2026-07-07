import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { ReportReason } from '../../types';

const REASONS: { value: ReportReason; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { value: 'Poor Work Quality', icon: 'construct-outline', label: 'Poor Work Quality' },
  { value: 'No Show', icon: 'person-remove-outline', label: 'No Show' },
  { value: 'Incomplete Job', icon: 'checkmark-done-outline', label: 'Incomplete Job' },
  { value: 'Overcharging', icon: 'cash-outline', label: 'Overcharging' },
  { value: 'Unprofessional Conduct', icon: 'hand-left-outline', label: 'Unprofessional Conduct' },
  { value: 'Harassment or Abuse', icon: 'shield-outline', label: 'Harassment or Abuse' },
  { value: 'Payment Dispute', icon: 'card-outline', label: 'Payment Dispute' },
  { value: 'Damaged Property', icon: 'home-outline', label: 'Damaged Property' },
  { value: 'Late or Delayed', icon: 'time-outline', label: 'Late or Delayed' },
  { value: 'False Accusation', icon: 'alert-circle-outline', label: 'False Accusation' },
  { value: 'Other', icon: 'ellipsis-horizontal-outline', label: 'Other' },
];

interface ReportReasonSelectorProps {
  selected: ReportReason | null;
  onChange: (reason: ReportReason) => void;
}

export function ReportReasonSelector({ selected, onChange }: ReportReasonSelectorProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row flex-wrap gap-2">
      {REASONS.map((r) => {
        const isSelected = selected === r.value;
        return (
          <Pressable
            key={r.value}
            onPress={() => onChange(r.value)}
            android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
            style={{
              backgroundColor: isSelected ? colors.primary['500'] : colors.ui.surface,
              borderColor: isSelected ? colors.primary['500'] : colors.ui.border,
            }}
            className="flex-row items-center gap-1.5 rounded-full border px-3.5 py-2">
            <Ionicons
              name={r.icon}
              size={14}
              color={isSelected ? '#FFFFFF' : colors.ui.textMuted}
            />
            <Text
              className="text-[13px] font-medium"
              style={{ color: isSelected ? '#FFFFFF' : colors.ui.text }}>
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
