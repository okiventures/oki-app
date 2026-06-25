import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { CalendarPicker } from '../ui/CalendarPicker';
import { TimePicker } from '../ui/TimePicker';
import { Button } from '../ui/Button';

interface ScheduleStepProps {
  mode: 'now' | 'later';
  selectedDate: string;
  selectedHour: number;
  selectedMinute?: number;
  onDateChange: (d: string) => void;
  onHourChange: (h: number) => void;
  onMinuteChange?: (m: number) => void;
  onSwitchMode?: (newMode: 'now' | 'later') => void;
}

export function NewBookingScheduleStep({
  mode,
  selectedDate,
  selectedHour,
  selectedMinute = 0,
  onDateChange,
  onHourChange,
  onMinuteChange,
  onSwitchMode,
}: ScheduleStepProps) {
  const { colors } = useTheme();
  const isNow = mode === 'now';

  return (
    <View className="flex-1">
      <Text className="mb-1 text-[22px] font-bold" style={{ color: colors.ui.text }}>
        {isNow ? 'Booking immediately' : 'Date & time'}
      </Text>
      <Text className="mb-5 text-sm" style={{ color: colors.ui.textMuted }}>
        {isNow
          ? 'Your booking is set for right now. A worker will head your way shortly.'
          : 'Choose a convenient slot for your service.'}
      </Text>

      {isNow ? (
        <View className="gap-4">
          <View
            className="rounded-3xl border-[1.5px] p-6"
            style={{
              backgroundColor: colors.primary['50'],
              borderColor: colors.primary['100'],
              shadowColor: colors.primary['600'],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}>
            <View
              className="mb-4 h-14 w-14 items-center justify-center self-center rounded-full"
              style={{ backgroundColor: colors.primary['100'] }}>
              <Ionicons name="flash" size={28} color={colors.primary['600']} />
            </View>
            <Text
              className="mb-1.5 text-center text-[18px] font-bold"
              style={{ color: colors.primary['700'] }}>
              Immediate dispatch
            </Text>
            <Text
              className="text-center text-[14px] leading-5"
              style={{ color: colors.primary['800'] }}>
              We{"'"}ll match you with the nearest available handyman right away.
            </Text>
          </View>

          {onSwitchMode && (
            <Button
              label="Prefer to Schedule for Later"
              variant="tertiary"
              fullWidth
              onPress={() => onSwitchMode('later')}
              leftIcon={
                <Ionicons name="calendar-outline" size={18} color={colors.primary['600']} />
              }
              style={{ borderRadius: 16, paddingVertical: 14 }}
            />
          )}
        </View>
      ) : (
        <View className="gap-4">
          <View
            className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
            style={{ backgroundColor: colors.primary['50'] }}>
            <Ionicons name="calendar" size={16} color={colors.primary['600']} />
            <Text className="text-[13px] font-medium" style={{ color: colors.primary['700'] }}>
              {(() => {
                const [y, m, d] = selectedDate.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                const h12 = selectedHour % 12 === 0 ? 12 : selectedHour % 12;
                const ampm = selectedHour >= 12 ? 'PM' : 'AM';
                const mins = String(selectedMinute).padStart(2, '0');
                return `${formattedDate} · ${h12}:${mins} ${ampm}`;
              })()}
            </Text>
          </View>

          <CalendarPicker selectedDate={selectedDate} onDateChange={onDateChange} />

          <TimePicker
            selectedHour={selectedHour}
            selectedMinute={selectedMinute}
            onHourChange={onHourChange}
            onMinuteChange={onMinuteChange || (() => {})}
          />

          {onSwitchMode && (
            <Button
              label="Need it immediately? Book Now"
              variant="tertiary"
              fullWidth
              onPress={() => onSwitchMode('now')}
              leftIcon={<Ionicons name="flash-outline" size={18} color={colors.ui.textMuted} />}
              style={{
                borderColor: colors.ui.border,
                borderRadius: 16,
                paddingVertical: 14,
              }}
              textStyle={{ color: colors.ui.textMuted }}
            />
          )}
        </View>
      )}
    </View>
  );
}
