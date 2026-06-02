import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Input } from '../forms/Input';

interface DetailsStepProps {
  address: string;
  description: string;
  notes: string;
  onAddressChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onNotesChange: (v: string) => void;
}

export function NewBookingDetailsStep({
  address,
  description,
  notes,
  onAddressChange,
  onDescriptionChange,
  onNotesChange,
}: DetailsStepProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-1">
      <Text className="mb-1 text-[22px] font-bold" style={{ color: colors.ui.text }}>
        Service details
      </Text>
      <Text className="mb-5 text-sm" style={{ color: colors.ui.textMuted }}>
        Tell us where and what needs to be done.
      </Text>

      <Input
        label="Service Address"
        placeholder="e.g. 123 Rizal St, Cebu City"
        value={address}
        onChangeText={onAddressChange}
        leftIcon={<Ionicons name="location-outline" size={18} color={colors.ui.textMuted} />}
      />

      <View className="mt-2" />

      <Input
        label="Describe the problem"
        placeholder="e.g. Leaking pipe under the kitchen sink, water drips every few seconds…"
        value={description}
        onChangeText={onDescriptionChange}
        multiline
        numberOfLines={4}
      />

      <View className="mt-2" />

      <Input
        label="Order Notes (Optional)"
        placeholder="e.g. Ring the doorbell, gate is open, beware of dogs…"
        value={notes}
        onChangeText={onNotesChange}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        className="mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
        style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.primary['50'] }}>
          <Ionicons name="camera-outline" size={18} color={colors.primary['600']} />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
            Add photos (optional)
          </Text>
          <Text className="text-[11px]" style={{ color: colors.ui.textMuted }}>
            Helps the handyman prepare better
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.ui.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
