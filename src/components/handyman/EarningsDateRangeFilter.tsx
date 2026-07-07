import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { DatePickerModal } from './DatePickerModal';

const PRESETS = ['This Day', 'This Week', 'This Month', 'Last Month', 'Custom'] as const;

export type Preset = (typeof PRESETS)[number];

interface EarningsDateRangeFilterProps {
  selectedPreset: Preset;
  onPresetChange: (preset: Preset) => void;
  customStartDate: Date;
  customEndDate: Date;
  onCustomDateChange: (start: Date, end: Date) => void;
  rangeLabel?: string;
}

const PRESET_INFO: Record<string, string> = {
  'This Day': 'Single day view',
  'This Week': 'Mon–Sun this week',
  'This Month': 'Full month',
  'Last Month': 'Previous month',
  Custom: 'Pick any range',
};

export function EarningsDateRangeFilter({
  selectedPreset,
  onPresetChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  rangeLabel,
}: EarningsDateRangeFilterProps) {
  const { colors } = useTheme();
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);

  const dateStr = (d: Date) =>
    d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {PRESETS.map((preset) => {
            const isActive = preset === selectedPreset;
            return (
              <Pressable
                key={preset}
                onPress={() => onPresetChange(preset)}
                android_ripple={{ color: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: isActive ? colors.primary['600'] : colors.ui.border,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                })}>
                <Text
                  className="text-[12px] font-medium"
                  style={{ color: isActive ? '#FFF' : colors.ui.textMuted }}>
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {selectedPreset !== 'Custom' && rangeLabel && (
        <View className="flex-row items-center gap-1.5 px-0.5 pt-2">
          <Text className="text-[11px] font-medium" style={{ color: colors.primary['600'] }}>
            {rangeLabel}
          </Text>
          <Text className="text-[10px] text-gray-400">·</Text>
          <Text className="text-[10px]" style={{ color: colors.ui.textMuted }}>
            {PRESET_INFO[selectedPreset]}
          </Text>
        </View>
      )}

      {selectedPreset === 'Custom' && (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => setPickerTarget('start')}
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, { flex: 1 }]}>
            <View
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
              <Text
                className="mb-0.5 text-[11px] font-medium"
                style={{ color: colors.ui.textMuted }}>
                From
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-semibold" style={{ color: colors.ui.text }}>
                  {dateStr(customStartDate)}
                </Text>
                <Ionicons name="calendar-outline" size={15} color={colors.ui.textMuted} />
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setPickerTarget('end')}
            android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, { flex: 1 }]}>
            <View
              className="rounded-xl border px-3 py-2.5"
              style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
              <Text
                className="mb-0.5 text-[11px] font-medium"
                style={{ color: colors.ui.textMuted }}>
                To
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-semibold" style={{ color: colors.ui.text }}>
                  {dateStr(customEndDate)}
                </Text>
                <Ionicons name="calendar-outline" size={15} color={colors.ui.textMuted} />
              </View>
            </View>
          </Pressable>
        </View>
      )}

      <DatePickerModal
        visible={pickerTarget === 'start'}
        selectedDate={customStartDate}
        label="Start date"
        onSelect={(d) => {
          if (d.getTime() <= customEndDate.getTime()) {
            onCustomDateChange(d, customEndDate);
            setPickerTarget(null);
          }
        }}
        onClose={() => setPickerTarget(null)}
      />
      <DatePickerModal
        visible={pickerTarget === 'end'}
        selectedDate={customEndDate}
        label="End date"
        onSelect={(d) => {
          if (d.getTime() >= customStartDate.getTime()) {
            onCustomDateChange(customStartDate, d);
            setPickerTarget(null);
          }
        }}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
}
