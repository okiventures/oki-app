import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Modal, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  label: string;
  minDate?: Date;
  maxDate?: Date;
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_FULL = [
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
const DAY_HEADS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = 42;

function monthDays(m: number, y: number) {
  return {
    days: new Date(y, m + 1, 0).getDate(),
    start: new Date(y, m, 1).getDay(),
  };
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function clampMonth(d: Date, min?: Date, max?: Date) {
  if (min && d < min) return new Date(min);
  if (max && d > max) return new Date(max);
  return d;
}

type ViewMode = 'days' | 'months';

export function DatePickerModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
  label,
  minDate,
  maxDate,
}: DatePickerModalProps) {
  const { colors } = useTheme();
  const { width: sw } = useWindowDimensions();
  const [vd, setVd] = useState(selectedDate);
  const [mode, setMode] = useState<ViewMode>('days');
  const yearStripRef = useRef<ScrollView>(null);
  const yearLayoutDone = useRef(false);

  const { days, start } = monthDays(vd.getMonth(), vd.getFullYear());
  const today = new Date();
  const yearStart = minDate?.getFullYear() ?? today.getFullYear() - 5;
  const yearEnd = maxDate?.getFullYear() ?? today.getFullYear() + 5;
  const yrs = Array.from({ length: yearEnd - yearStart + 1 }, (_, i) => yearStart + i);

  const disabled = (d: Date) => (minDate && d < minDate) || (maxDate && d > maxDate);
  const monthDisabled = (m: number, y: number) => {
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return disabled(first) && disabled(last);
  };

  useEffect(() => {
    if (visible) {
      setVd(selectedDate);
      setMode('days');
      yearLayoutDone.current = false;
    }
  }, [visible, selectedDate]);

  const curYear = vd.getFullYear();

  const scrollYearStrip = useCallback(() => {
    if (!yearStripRef.current) return;
    const idx = yrs.indexOf(curYear);
    if (idx < 0) return;
    const itemW = 72;
    const visibleW = Math.min(sw - 48, 340) - 32;
    const scrollX = 60 + idx * itemW + 36 - visibleW / 2;
    const maxScroll = Math.max(0, yrs.length * itemW + 120 - visibleW);
    yearStripRef.current.scrollTo({
      x: Math.min(Math.max(0, scrollX), maxScroll),
      animated: false,
    });
  }, [curYear, sw, yrs]);

  useEffect(() => {
    if (mode === 'months' && yearStripRef.current) {
      setTimeout(scrollYearStrip, 50);
      setTimeout(scrollYearStrip, 150);
    }
  }, [mode, scrollYearStrip]);

  const atMinMonth =
    minDate && vd.getFullYear() === minDate.getFullYear() && vd.getMonth() === minDate.getMonth();
  const atMaxMonth =
    maxDate && vd.getFullYear() === maxDate.getFullYear() && vd.getMonth() === maxDate.getMonth();
  const atMinYear = minDate && vd.getFullYear() <= minDate.getFullYear();
  const atMaxYear = maxDate && vd.getFullYear() >= maxDate.getFullYear();

  const cardW = Math.min(sw - 48, 340);
  const innerW = cardW - 32;
  const gridW = CELL * 7;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={onClose}>
        <Pressable
          onPress={() => {}}
          className="overflow-hidden rounded-2xl bg-white shadow-xl"
          style={{ width: cardW }}>
          <View className="flex-row items-center justify-between border-b border-gray-100 px-4 pt-4 pb-3">
            <Pressable onPress={onClose} className="rounded-lg px-2 py-1 active:opacity-70">
              <Text className="text-[13px] font-medium" style={{ color: colors.ui.textMuted }}>
                Cancel
              </Text>
            </Pressable>
            <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
              {label}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {mode === 'days' && (
            <View className="px-4 pt-2 pb-4">
              <View style={{ width: gridW, alignSelf: 'center' }}>
                <View className="mb-3 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => {
                      const d = new Date(vd);
                      d.setMonth(d.getMonth() - 1);
                      setVd(clampMonth(d, minDate, maxDate));
                    }}
                    disabled={atMinMonth}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: atMinMonth ? '#F3F4F6' : `${colors.primary['600']}0D`,
                      opacity: atMinMonth ? 0.4 : 1,
                    }}>
                    <Ionicons
                      name="chevron-back"
                      size={16}
                      color={atMinMonth ? '#D1D5DB' : colors.primary['600']}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => setMode('months')}
                    className="flex-row items-center gap-1 active:opacity-70">
                    <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
                      {MONTHS_FULL[vd.getMonth()]} {vd.getFullYear()}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={colors.ui.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const d = new Date(vd);
                      d.setMonth(d.getMonth() + 1);
                      setVd(clampMonth(d, minDate, maxDate));
                    }}
                    disabled={atMaxMonth}
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: atMaxMonth ? '#F3F4F6' : `${colors.primary['600']}0D`,
                      opacity: atMaxMonth ? 0.4 : 1,
                    }}>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={atMaxMonth ? '#D1D5DB' : colors.primary['600']}
                    />
                  </Pressable>
                </View>

                <View className="mb-1 flex-row">
                  {DAY_HEADS.map((d, i) => (
                    <View
                      key={`dh-${i}`}
                      style={{ width: CELL }}
                      className="items-center justify-center py-1">
                      <Text
                        className="text-[10px] font-bold tracking-wider"
                        style={{ color: '#B0B7BF' }}>
                        {d}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap">
                  {Array.from({ length: start }, (_, i) => (
                    <View key={`e-${i}`} style={{ width: CELL, height: CELL }} />
                  ))}
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1;
                    const dt = new Date(vd.getFullYear(), vd.getMonth(), d);
                    const sel = sameDay(dt, selectedDate);
                    const td = sameDay(dt, today);
                    const dis = disabled(dt);
                    return (
                      <Pressable
                        key={d}
                        onPress={dis ? undefined : () => onSelect(dt)}
                        style={{ width: CELL, height: CELL }}
                        className="items-center justify-center">
                        <View
                          className="items-center justify-center"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: sel
                              ? colors.primary['600']
                              : td
                                ? `${colors.primary['600']}0D`
                                : undefined,
                            borderWidth: td && !sel ? 1.5 : 0,
                            borderColor: td && !sel ? colors.primary['400'] : undefined,
                            opacity: dis ? 0.15 : 1,
                          }}>
                          <Text
                            className="text-[14px]"
                            style={{
                              fontWeight: sel || td ? '700' : '500',
                              color: sel ? '#FFF' : dis ? colors.ui.textMuted : colors.ui.text,
                            }}>
                            {d}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() => {
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    onSelect(d);
                  }}
                  className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl py-2"
                  style={{ backgroundColor: `${colors.primary['600']}0D` }}>
                  <Ionicons name="calendar" size={14} color={colors.primary['600']} />
                  <Text
                    className="text-[12px] font-semibold"
                    style={{ color: colors.primary['600'] }}>
                    Today
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {mode === 'months' && (
            <View className="px-4 pt-2 pb-4">
              <View style={{ width: innerW, alignSelf: 'center' }}>
                {/* Year header with arrows */}
                <View className="mb-3 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => {
                      const newY = vd.getFullYear() - 1;
                      if (!minDate || newY >= minDate.getFullYear()) {
                        const d = new Date(vd);
                        d.setFullYear(newY);
                        setVd(clampMonth(d, minDate, maxDate));
                      }
                    }}
                    disabled={atMinYear}
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: atMinYear ? '#F3F4F6' : `${colors.primary['600']}0D`,
                      opacity: atMinYear ? 0.4 : 1,
                    }}>
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={atMinYear ? '#D1D5DB' : colors.primary['600']}
                    />
                  </Pressable>
                  <Pressable onPress={() => setMode('days')} className="active:opacity-70">
                    <Text className="font-heading text-[20px]" style={{ color: colors.ui.text }}>
                      {vd.getFullYear()}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const newY = vd.getFullYear() + 1;
                      if (!maxDate || newY <= maxDate.getFullYear()) {
                        const d = new Date(vd);
                        d.setFullYear(newY);
                        setVd(clampMonth(d, minDate, maxDate));
                      }
                    }}
                    disabled={atMaxYear}
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: atMaxYear ? '#F3F4F6' : `${colors.primary['600']}0D`,
                      opacity: atMaxYear ? 0.4 : 1,
                    }}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={atMaxYear ? '#D1D5DB' : colors.primary['600']}
                    />
                  </Pressable>
                </View>

                {/* 3×4 month grid */}
                <View className="mb-3 flex-row flex-wrap">
                  {MONTHS_SHORT.map((m, i) => {
                    const active = i === vd.getMonth();
                    const currentMonth =
                      i === today.getMonth() && vd.getFullYear() === today.getFullYear();
                    const dis = monthDisabled(i, vd.getFullYear());
                    return (
                      <Pressable
                        key={m}
                        onPress={
                          dis
                            ? undefined
                            : () => {
                                const d = new Date(vd);
                                d.setMonth(i);
                                setVd(clampMonth(d, minDate, maxDate));
                                setMode('days');
                              }
                        }
                        className="mb-1 items-center justify-center"
                        style={{ width: `${100 / 3}%`, height: 46 }}>
                        <View
                          className="items-center justify-center rounded-xl"
                          style={{
                            width: innerW / 3 - 12,
                            height: 38,
                            backgroundColor: active
                              ? colors.primary['600']
                              : dis
                                ? 'transparent'
                                : `${colors.primary['600']}06`,
                            borderWidth: currentMonth && !active ? 1.5 : 0,
                            borderColor:
                              currentMonth && !active ? colors.primary['400'] : undefined,
                            opacity: dis ? 0.15 : 1,
                          }}>
                          <Text
                            className="text-[13px]"
                            style={{
                              fontWeight: active || currentMonth ? '700' : '500',
                              color: active ? '#FFF' : dis ? colors.ui.textMuted : colors.ui.text,
                            }}>
                            {m}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Horizontal year strip */}
                <View>
                  <ScrollView
                    ref={yearStripRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    snapToInterval={72}
                    snapToAlignment="center">
                    <View
                      className="flex-row items-center px-[60]"
                      style={{ height: 40 }}
                      onLayout={() => {
                        if (!yearLayoutDone.current) {
                          yearLayoutDone.current = true;
                          scrollYearStrip();
                        }
                      }}>
                      {yrs.map((y) => {
                        const active = y === vd.getFullYear();
                        const inRange =
                          (!minDate || y >= minDate.getFullYear()) &&
                          (!maxDate || y <= maxDate.getFullYear());
                        return (
                          <Pressable
                            key={y}
                            onPress={
                              inRange
                                ? () => {
                                    const d = new Date(vd);
                                    d.setFullYear(y);
                                    setVd(clampMonth(d, minDate, maxDate));
                                  }
                                : undefined
                            }
                            className="mx-1 h-9 items-center justify-center rounded-lg"
                            style={{
                              width: 64,
                              backgroundColor: active
                                ? colors.primary['600']
                                : inRange
                                  ? `${colors.primary['600']}08`
                                  : undefined,
                              opacity: inRange ? 1 : 0.15,
                            }}>
                            <Text
                              className="text-[13px] font-semibold"
                              style={{
                                color: active
                                  ? '#FFF'
                                  : inRange
                                    ? colors.ui.text
                                    : colors.ui.textMuted,
                              }}>
                              {y}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Back to calendar button */}
                <Pressable
                  onPress={() => setMode('days')}
                  className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl py-2"
                  style={{ backgroundColor: `${colors.primary['600']}0D` }}>
                  <Ionicons name="calendar" size={14} color={colors.primary['600']} />
                  <Text
                    className="text-[12px] font-semibold"
                    style={{ color: colors.primary['600'] }}>
                    Back to calendar
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
