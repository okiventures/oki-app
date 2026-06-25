import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TimePickerProps {
  selectedHour: number;
  selectedMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

export function TimePicker({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
}: TimePickerProps) {
  const { colors } = useTheme();

  const displayHour = selectedHour % 12 === 0 ? 12 : selectedHour % 12;
  const isPm = selectedHour >= 12;

  const handleHourUp = () => {
    let next12 = displayHour + 1;
    if (next12 > 12) next12 = 1;
    const next24 = isPm ? (next12 === 12 ? 12 : next12 + 12) : next12 === 12 ? 0 : next12;
    onHourChange(next24);
  };

  const handleHourDown = () => {
    let next12 = displayHour - 1;
    if (next12 < 1) next12 = 12;
    const next24 = isPm ? (next12 === 12 ? 12 : next12 + 12) : next12 === 12 ? 0 : next12;
    onHourChange(next24);
  };

  const handleMinuteUp = () => {
    const nextMin = (selectedMinute + 15) % 60;
    onMinuteChange(nextMin);
  };

  const handleMinuteDown = () => {
    const nextMin = (selectedMinute - 15 + 60) % 60;
    onMinuteChange(nextMin);
  };

  const handleAmPmToggle = (pm: boolean) => {
    if (pm === isPm) return;
    const baseHour = selectedHour % 12;
    const next24 = pm ? (baseHour === 0 ? 12 : baseHour + 12) : baseHour === 0 ? 0 : baseHour;
    onHourChange(next24);
  };

  return (
    <View
      className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
      style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
      <Text className="mb-4 text-[13px] font-bold text-gray-700" style={{ color: colors.ui.text }}>
        Choose time
      </Text>

      <View className="flex-row items-center justify-center py-2">
        <View className="items-center px-3">
          <TouchableOpacity onPress={handleHourUp} className="mb-1 p-1">
            <Ionicons name="chevron-up" size={16} color={colors.ui.textMuted} />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-gray-900" style={{ color: colors.ui.text }}>
            {String(displayHour).padStart(2, '0')}
          </Text>
          <TouchableOpacity onPress={handleHourDown} className="mt-1 p-1">
            <Ionicons name="chevron-down" size={16} color={colors.ui.textMuted} />
          </TouchableOpacity>
        </View>

        <Text
          className="px-1 text-[20px] font-bold text-gray-900"
          style={{ color: colors.ui.text }}>
          :
        </Text>

        <View className="items-center px-3">
          <TouchableOpacity onPress={handleMinuteUp} className="mb-1 p-1">
            <Ionicons name="chevron-up" size={16} color={colors.ui.textMuted} />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-gray-900" style={{ color: colors.ui.text }}>
            {String(selectedMinute).padStart(2, '0')}
          </Text>
          <TouchableOpacity onPress={handleMinuteDown} className="mt-1 p-1">
            <Ionicons name="chevron-down" size={16} color={colors.ui.textMuted} />
          </TouchableOpacity>
        </View>

        <View
          className="flex-row items-center gap-2 border-l border-gray-200 pl-5"
          style={{ borderLeftColor: colors.ui.border }}>
          <TouchableOpacity onPress={() => handleAmPmToggle(false)} className="px-1 py-1.5">
            <Text
              className={`text-[14px] ${!isPm ? 'text-primary-600 font-bold' : 'font-medium text-gray-400'}`}>
              AM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleAmPmToggle(true)} className="px-1 py-1.5">
            <Text
              className={`text-[14px] ${isPm ? 'text-primary-600 font-bold' : 'font-medium text-gray-400'}`}>
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
