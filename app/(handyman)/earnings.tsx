import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import {
  MOCK_EARNINGS,
  MOCK_HANDYMAN_WALLET,
  filterEarningsByRange,
  getDailyAggregates,
  fillHourlyTotals,
  fillDailyTotals,
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  getLastMonthRange,
  getRangeLabel,
} from '../../src/mocks';
import { formatCurrency } from '../../src/utils';
import { CATEGORY_ICONS } from '../../src/constants/categories';
import { EarningsTrendChart } from '../../src/components/handyman/EarningsTrendChart';
import { EarningsCategoryBreakdown } from '../../src/components/handyman/EarningsCategoryBreakdown';
import { EarningsPieChart } from '../../src/components/handyman/EarningsPieChart';
import { DatePickerModal } from '../../src/components/handyman/DatePickerModal';

type ChartMode = 'bar' | 'category' | 'pie';

const PRESETS = ['This Day', 'This Week', 'This Month', 'Last Month', 'Custom'] as const;
type Preset = (typeof PRESETS)[number];

const PRESET_RANGES: Record<Exclude<Preset, 'Custom'>, () => { start: Date; end: Date }> = {
  'This Day': getTodayRange,
  'This Week': getThisWeekRange,
  'This Month': getThisMonthRange,
  'Last Month': getLastMonthRange,
};

const PRESET_HINTS: Record<Preset, string> = {
  'This Day': 'Hourly breakdown',
  'This Week': 'Mon–Sun',
  'This Month': 'Full month',
  'Last Month': 'Previous month',
  Custom: 'Pick any range',
};

const CHART_MODES: { key: ChartMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'bar', label: 'Chart', icon: 'bar-chart-outline' },
  { key: 'pie', label: 'Mix', icon: 'pie-chart-outline' },
  { key: 'category', label: 'Types', icon: 'layers-outline' },
];

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateStr(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HandymanEarnings() {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedPreset, setSelectedPreset] = useState<Preset>('This Week');
  const [chartMode, setChartMode] = useState<ChartMode>('bar');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [dateError, setDateError] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contentWidth = screenWidth - 32;

  const range = useMemo(() => {
    if (selectedPreset === 'Custom') return { start: customStart, end: customEnd };
    const fn = PRESET_RANGES[selectedPreset];
    return fn ? fn() : getThisWeekRange();
  }, [selectedPreset, customStart, customEnd]);

  const filteredEntries = useMemo(
    () => filterEarningsByRange(MOCK_EARNINGS, range.start, range.end),
    [range.start, range.end]
  );

  const rangeTotal = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + e.netEarnings, 0),
    [filteredEntries]
  );

  const lifetimeTotal = useMemo(() => MOCK_EARNINGS.reduce((sum, e) => sum + e.netEarnings, 0), []);

  const isSingleDay = range.start.toDateString() === range.end.toDateString();

  const dailyTotals = useMemo(() => {
    if (isSingleDay) return fillHourlyTotals(filteredEntries);
    return fillDailyTotals(getDailyAggregates(filteredEntries), range.start, range.end);
  }, [filteredEntries, range.start, range.end, isSingleDay]);

  const jobCount = filteredEntries.length;
  const avgPerJob = jobCount > 0 ? Math.round(rangeTotal / jobCount) : 0;

  const categoryData = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const e of filteredEntries) {
      const prev = map.get(e.serviceCategory) ?? { amount: 0, count: 0 };
      map.set(e.serviceCategory, { amount: prev.amount + e.netEarnings, count: prev.count + 1 });
    }
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredEntries]);

  const rangeLabel = useMemo(
    () => getRangeLabel(selectedPreset, range.start, range.end),
    [selectedPreset, range]
  );

  const sortedEntries = useMemo(
    () =>
      [...filteredEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filteredEntries]
  );

  /* Day-of-week breakdown (all-time average) */
  const dayOfWeekData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
    for (const e of MOCK_EARNINGS) {
      const day = new Date(e.date).getDay();
      buckets[day].total += e.netEarnings;
      buckets[day].count += 1;
    }
    const values = buckets.map((b) => (b.count > 0 ? b.total / b.count : 0));
    const max = Math.max(...values, 1);
    return buckets.map((b, i) => ({
      day: DAY_ABBR[i],
      avg: values[i],
      count: b.count,
      pct: values[i] / max,
    }));
  }, []);

  const bestDay = useMemo(() => {
    let best = 0;
    for (let i = 0; i < dayOfWeekData.length; i++) {
      if (dayOfWeekData[i].avg > dayOfWeekData[best].avg) best = i;
    }
    return best;
  }, [dayOfWeekData]);

  const showDateError = () => {
    setDateError(true);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setDateError(false), 2000);
  };

  useEffect(
    () => () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    },
    []
  );

  const wallet = MOCK_HANDYMAN_WALLET;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.primary['600'] }}>
      <ScreenHeader title="Earnings" showBack />

      <View
        className="flex-1 overflow-hidden rounded-t-[32px]"
        style={{ backgroundColor: colors.ui.background, marginTop: -32 }}>
        <ScrollView
          className="mt-5 flex-1"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}>
          {/* Preset pills */}
          <View className="px-4 pb-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {PRESETS.map((preset) => {
                  const active = preset === selectedPreset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setSelectedPreset(preset)}
                      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                      style={{
                        backgroundColor: active ? colors.primary['600'] : colors.ui.border,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                      }}>
                      <Text
                        className="text-[12px] font-semibold"
                        style={{ color: active ? '#FFF' : colors.ui.textMuted }}>
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {selectedPreset !== 'Custom' ? (
              <View className="flex-row items-center gap-1.5 pt-1.5">
                <Text className="text-[11px] font-medium" style={{ color: colors.primary['600'] }}>
                  {rangeLabel}
                </Text>
                <Text className="text-[10px] text-gray-300">·</Text>
                <Text className="text-[10px]" style={{ color: colors.ui.textMuted }}>
                  {PRESET_HINTS[selectedPreset]}
                </Text>
              </View>
            ) : (
              <View className="flex-row gap-2 pt-2">
                <Pressable
                  onPress={() => setPickerTarget('start')}
                  android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                  className="flex-1">
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
                        {dateStr(customStart)}
                      </Text>
                      <Ionicons name="calendar-outline" size={15} color={colors.ui.textMuted} />
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setPickerTarget('end')}
                  android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                  className="flex-1">
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
                        {dateStr(customEnd)}
                      </Text>
                      <Ionicons name="calendar-outline" size={15} color={colors.ui.textMuted} />
                    </View>
                  </View>
                </Pressable>
              </View>
            )}

            {dateError && (
              <View className="mt-2 flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={12} color="#DC2626" />
                <Text className="text-[10px] font-medium text-red-600">
                  Start date must be before end date
                </Text>
              </View>
            )}
          </View>

          {/* Hero card — range total */}
          <View className="px-4 pb-4">
            <View
              className="rounded-3xl px-5 pt-5 pb-5"
              style={{ backgroundColor: colors.primary['600'] }}>
              <Text className="mb-1 text-[12px] font-medium tracking-wider text-white/70">
                {rangeLabel.toUpperCase()}
              </Text>
              <Text className="font-heading mb-3 text-4xl tracking-tight text-white">
                {formatCurrency(rangeTotal)}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                  <Ionicons name="briefcase-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text className="text-[11px] font-medium text-white/80">{jobCount} jobs</Text>
                </View>
                <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                  <Ionicons name="calculator-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text className="text-[11px] font-medium text-white/80">
                    Avg {formatCurrency(avgPerJob)}/job
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Compact stats row — Lifetime / Available / Pending */}
          <View className="px-4 pb-5">
            <View className="flex-row gap-2.5">
              {[
                {
                  label: 'Lifetime Total',
                  value: lifetimeTotal,
                  icon: 'cash-outline' as const,
                  bg: `${colors.primary['600']}0D`,
                  iconBg: `${colors.primary['600']}18`,
                  txtColor: colors.ui.text,
                },
                {
                  label: 'Available',
                  value: wallet.availableBalance,
                  icon: 'wallet-outline' as const,
                  bg: '#F0FDF4',
                  iconBg: '#DCFCE7',
                  txtColor: '#166534',
                },
                {
                  label: 'Pending',
                  value: wallet.pendingBalance,
                  icon: 'time-outline' as const,
                  bg: '#FFFBEB',
                  iconBg: '#FEF3C7',
                  txtColor: '#92400E',
                },
              ].map((item) => (
                <View
                  key={item.label}
                  className="flex-1 rounded-2xl p-3"
                  style={{ backgroundColor: item.bg }}>
                  <View
                    className="mb-2 h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: item.iconBg }}>
                    <Ionicons name={item.icon} size={13} color={item.txtColor} />
                  </View>
                  <Text
                    className="mb-0.5 text-[10px] font-medium"
                    style={{ color: item.txtColor, opacity: 0.7 }}>
                    {item.label}
                  </Text>
                  <Text className="font-heading text-sm" style={{ color: item.txtColor }}>
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Chart section */}
          <View className="px-4 pb-4">
            <View
              className="mb-3 flex-row rounded-lg p-0.5"
              style={{ backgroundColor: colors.ui.border }}>
              {CHART_MODES.map((mode) => {
                const active = chartMode === mode.key;
                return (
                  <Pressable
                    key={mode.key}
                    onPress={() => setChartMode(mode.key)}
                    android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                    className="flex-1 flex-row items-center justify-center gap-1 rounded-md py-1.5"
                    style={
                      active
                        ? {
                            backgroundColor: colors.ui.surface,
                            shadowColor: '#000',
                            shadowOpacity: 0.06,
                            shadowRadius: 2,
                            shadowOffset: { width: 0, height: 1 },
                            elevation: 1,
                          }
                        : {}
                    }>
                    <Ionicons
                      name={mode.icon}
                      size={13}
                      color={active ? colors.primary['600'] : colors.ui.textMuted}
                    />
                    <Text
                      className="text-[12px] font-semibold"
                      style={{ color: active ? colors.primary['600'] : colors.ui.textMuted }}>
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {chartMode === 'pie' ? (
              <EarningsPieChart
                slices={categoryData.map((c) => ({
                  label: c.category,
                  value: c.amount,
                }))}
              />
            ) : chartMode === 'category' ? (
              <EarningsCategoryBreakdown items={categoryData} chartWidth={contentWidth} />
            ) : (
              <EarningsTrendChart
                dailyTotals={dailyTotals}
                rangeLabel={rangeLabel}
                chartWidth={contentWidth - 32}
                isHourly={isSingleDay}
              />
            )}
          </View>

          {/* Day-of-week breakdown */}
          <View className="px-4 pb-4">
            <View
              className="rounded-2xl px-4 pt-4 pb-4"
              style={{
                backgroundColor: colors.ui.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}>
              <View className="mb-1 flex-row items-center justify-between">
                <View>
                  <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
                    Day of Week
                  </Text>
                  <Text className="text-[10px] font-medium" style={{ color: colors.ui.textMuted }}>
                    All-time average per job
                  </Text>
                </View>
                <Text className="text-[10px] font-medium" style={{ color: colors.ui.textMuted }}>
                  Best: {DAY_ABBR[bestDay]}
                </Text>
              </View>
              <View className="mt-3 gap-2.5">
                {dayOfWeekData.map((d) => (
                  <View key={d.day} className="flex-row items-center gap-2.5">
                    <Text
                      className="w-8 text-right text-[11px] font-semibold"
                      style={{ color: '#9CA3AF' }}>
                      {d.day}
                    </Text>
                    <View
                      className="h-5 flex-1 rounded-full"
                      style={{ backgroundColor: '#F3F4F6' }}>
                      <View
                        className="h-5 rounded-full"
                        style={{
                          width: `${Math.max(3, d.pct * 100)}%`,
                          backgroundColor: colors.primary['500'],
                        }}
                      />
                    </View>
                    <Text
                      className="w-24 text-right text-[11px] font-medium"
                      style={{ color: colors.ui.text }}
                      numberOfLines={1}>
                      {formatCurrency(d.avg)}/job
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Recent earnings */}
          {sortedEntries.length > 0 && (
            <View className="px-4">
              <Text className="font-heading mb-3 text-[15px]" style={{ color: colors.ui.text }}>
                Recent
              </Text>
              <View
                className="rounded-2xl"
                style={{
                  backgroundColor: colors.ui.surface,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                {sortedEntries.slice(0, 8).map((entry, i, arr) => (
                  <View
                    key={entry.id}
                    className="flex-row items-center gap-3 px-4"
                    style={{
                      paddingTop: i === 0 ? 14 : 12,
                      paddingBottom: i === arr.length - 1 ? 14 : 12,
                      borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                      borderBottomColor: colors.ui.border,
                    }}>
                    <View
                      className="h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${colors.primary['600']}10` }}>
                      <Text style={{ fontSize: 14 }}>
                        {CATEGORY_ICONS[entry.serviceCategory] ?? '\u{1F6E0}'}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-[13px] font-semibold" style={{ color: colors.ui.text }}>
                        {entry.serviceCategory}
                      </Text>
                      <Text className="mt-0.5 text-[10px]" style={{ color: colors.ui.textMuted }}>
                        {new Date(entry.date).toLocaleDateString('en-PH', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-[13px] font-bold" style={{ color: '#16A34A' }}>
                        +{formatCurrency(entry.netEarnings)}
                      </Text>
                      <Text className="text-[9px]" style={{ color: colors.ui.textMuted }}>
                        Fee {formatCurrency(entry.platformFee)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      <DatePickerModal
        visible={pickerTarget === 'start'}
        selectedDate={customStart}
        label="Start date"
        onSelect={(d) => {
          if (d.getTime() <= customEnd.getTime()) {
            setCustomStart(d);
            setPickerTarget(null);
          } else {
            showDateError();
            setPickerTarget(null);
          }
        }}
        onClose={() => setPickerTarget(null)}
        maxDate={customEnd}
      />
      <DatePickerModal
        visible={pickerTarget === 'end'}
        selectedDate={customEnd}
        label="End date"
        onSelect={(d) => {
          if (d.getTime() >= customStart.getTime()) {
            setCustomEnd(d);
            setPickerTarget(null);
          } else {
            showDateError();
            setPickerTarget(null);
          }
        }}
        onClose={() => setPickerTarget(null)}
        minDate={customStart}
      />
    </SafeAreaView>
  );
}
