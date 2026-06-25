import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Dropdown } from './Dropdown';

interface CalendarPickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEAR_RANGE = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i));

export function CalendarPicker({ selectedDate, onDateChange }: CalendarPickerProps) {
  const { colors } = useTheme();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const handlePrevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const handleNextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = MONTHS[month];

  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from(
    { length: firstDayIndex },
    (_, i) => prevMonthTotalDays - firstDayIndex + 1 + i
  );

  const currentMonthDays = Array.from({ length: totalDays }, (_, i) => i + 1);

  const totalSlotsNeeded = Math.ceil((prevMonthDays.length + currentMonthDays.length) / 7) * 7;
  const remainingDays = totalSlotsNeeded - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = Array.from({ length: remainingDays }, (_, i) => i + 1);

  const gridCells = [
    ...prevMonthDays.map((d) => ({ day: d, isCurrentMonth: false, monthOffset: -1 })),
    ...currentMonthDays.map((d) => ({ day: d, isCurrentMonth: true, monthOffset: 0 })),
    ...nextMonthDays.map((d) => ({ day: d, isCurrentMonth: false, monthOffset: 1 })),
  ];

  const getCellIso = (day: number, offset: number) => {
    const targetDate = new Date(year, month + offset, day);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <View
      className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
      style={{ borderColor: colors.ui.border, backgroundColor: colors.ui.surface }}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Dropdown
            label=""
            variant="inline"
            items={MONTHS}
            selected={monthName}
            onSelect={(m) => setCurrentMonth(new Date(year, MONTHS.indexOf(m), 1))}
          />
          <Dropdown
            label=""
            variant="inline"
            items={YEAR_RANGE}
            selected={String(year)}
            onSelect={(y) => setCurrentMonth(new Date(Number(y), month, 1))}
          />
        </View>

        <View className="flex-row gap-0.5">
          <TouchableOpacity onPress={handlePrevMonth} className="p-1.5">
            <Ionicons name="chevron-back" size={18} color={colors.ui.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth} className="p-1.5">
            <Ionicons name="chevron-forward" size={18} color={colors.ui.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mb-1.5 flex-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Text
            key={d}
            className="w-[14.28%] text-center text-[10px] font-bold"
            style={{ color: colors.ui.textMuted }}>
            {d}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {gridCells.map((cell, idx) => {
          const cellIso = getCellIso(cell.day, cell.monthOffset);
          const isSelected = cellIso === selectedDate;

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onDateChange(cellIso)}
              className="w-[14.28%] items-center justify-center py-1">
              <View
                className="h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isSelected ? colors.primary['600'] : 'transparent',
                }}>
                <Text
                  className="text-[13px] font-semibold"
                  style={
                    isSelected
                      ? { color: '#FFFFFF' }
                      : !cell.isCurrentMonth
                        ? { color: colors.ui.textLight }
                        : { color: colors.ui.text }
                  }>
                  {cell.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
