import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  getAvailabilityForHandyman,
  setDayAvailability,
  removeDayAvailability,
} from '../../mocks/availability';

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MIN_HOUR = 5;
const MAX_HOUR = 23;

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

interface DayConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

function parseDays(handymanId: string): DayConfig[] {
  const blocks = getAvailabilityForHandyman(handymanId);
  return DAY_LABELS.map((_, dayIdx) => {
    const block = blocks.find((b) => b.id === `${handymanId}-d${dayIdx}`);
    if (!block) return { enabled: false, startHour: 8, endHour: 17 };
    const startHour = new Date(block.startTime).getHours();
    const endHour = new Date(block.endTime).getHours();
    return { enabled: true, startHour, endHour };
  });
}

interface AvailabilityEditorProps {
  visible: boolean;
  onClose: () => void;
  handymanId: string;
  onSaved: () => void;
}

export function AvailabilityEditor({
  visible,
  onClose,
  handymanId,
  onSaved,
}: AvailabilityEditorProps) {
  const { colors } = useTheme();
  const [days, setDays] = useState<DayConfig[]>(() => parseDays(handymanId));

  function toggleDay(dayIdx: number) {
    setDays((prev) => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], enabled: !next[dayIdx].enabled };
      return next;
    });
  }

  function changeHour(dayIdx: number, field: 'startHour' | 'endHour', delta: 1 | -1) {
    setDays((prev) => {
      const next = [...prev];
      const current = next[dayIdx][field];
      let newHour = current + delta;
      if (newHour > MAX_HOUR) newHour = MIN_HOUR;
      if (newHour < MIN_HOUR) newHour = MAX_HOUR;

      if (field === 'startHour' && newHour >= next[dayIdx].endHour) {
        newHour = next[dayIdx].endHour - 1;
      }
      if (field === 'endHour' && newHour <= next[dayIdx].startHour) {
        newHour = next[dayIdx].startHour + 1;
      }
      if (newHour === current) return prev;

      next[dayIdx] = { ...next[dayIdx], [field]: newHour };
      return next;
    });
  }

  function handleSave() {
    days.forEach((day, idx) => {
      if (day.enabled) {
        setDayAvailability(handymanId, idx, day.startHour, day.endHour);
      } else {
        removeDayAvailability(handymanId, idx);
      }
    });
    onSaved();
  }

  const enabledCount = days.filter((d) => d.enabled).length;
  const anyEnabled = enabledCount > 0;

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Weekly Availability">
      {enabledCount > 0 && (
        <Text className="mb-3 text-[12px] font-medium text-gray-500">
          {enabledCount} day{enabledCount > 1 ? 's' : ''} active
        </Text>
      )}

      <ScrollView className="max-h-[440px]" showsVerticalScrollIndicator={false}>
        {days.map((day, idx) => (
          <Pressable
            key={idx}
            onPress={() => toggleDay(idx)}
            className="flex-row items-center border-b border-gray-100 py-3"
            android_ripple={{ color: '#F3F4F6' }}>
            <View
              className="mr-3 h-5 w-5 items-center justify-center rounded"
              style={{
                backgroundColor: day.enabled ? colors.primary['500'] : '#E5E7EB',
                borderWidth: day.enabled ? 0 : 1,
                borderColor: '#D1D5DB',
              }}>
              {day.enabled && <Ionicons name="checkmark" size={13} color="#FFF" />}
            </View>

            <Text
              className="flex-1 text-[14px] font-semibold"
              style={{ color: day.enabled ? colors.ui.text : '#9CA3AF' }}>
              {DAY_LABELS[idx]}
            </Text>

            {day.enabled && (
              <View className="flex-row items-center gap-1">
                <HourStepper
                  value={day.startHour}
                  onUp={() => changeHour(idx, 'startHour', 1)}
                  onDown={() => changeHour(idx, 'startHour', -1)}
                />
                <Text className="text-[11px] text-gray-400">—</Text>
                <HourStepper
                  value={day.endHour}
                  onUp={() => changeHour(idx, 'endHour', 1)}
                  onDown={() => changeHour(idx, 'endHour', -1)}
                />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1">
          <Button label="Cancel" variant="tertiary" onPress={onClose} />
        </View>
        <View className="flex-1">
          <Button
            label="Save Changes"
            variant="primary"
            onPress={handleSave}
            disabled={!anyEnabled}
          />
        </View>
      </View>
    </Modal>
  );
}

function HourStepper({
  value,
  onUp,
  onDown,
}: {
  value: number;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <View className="flex-row items-center rounded-lg border border-gray-200 bg-gray-50">
      <Pressable
        onPress={onDown}
        className="px-2 py-1.5"
        android_ripple={{ color: '#E5E7EB', borderless: true }}
        hitSlop={6}>
        <Ionicons name="chevron-down" size={13} color="#6B7280" />
      </Pressable>
      <Text className="min-w-[44px] text-center text-[12px] font-semibold text-gray-800">
        {formatHour(value)}
      </Text>
      <Pressable
        onPress={onUp}
        className="px-2 py-1.5"
        android_ripple={{ color: '#E5E7EB', borderless: true }}
        hitSlop={6}>
        <Ionicons name="chevron-up" size={13} color="#6B7280" />
      </Pressable>
    </View>
  );
}
