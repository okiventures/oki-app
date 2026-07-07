import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils';

interface BarData {
  date: string;
  total: number;
  jobs: number;
}

interface EarningsTrendChartProps {
  dailyTotals: BarData[];
  rangeLabel: string;
  chartWidth: number;
  isHourly?: boolean;
  noCard?: boolean;
}

const BAR_H = 150;
const PAD_L = 40;

const HOUR_LABELS: Record<number, string> = {
  0: '12:00AM',
  1: '1:00AM',
  2: '2:00AM',
  3: '3:00AM',
  4: '4:00AM',
  5: '5:00AM',
  6: '6:00AM',
  7: '7:00AM',
  8: '8:00AM',
  9: '9:00AM',
  10: '10:00AM',
  11: '11:00AM',
  12: '12:00PM',
  13: '1:00PM',
  14: '2:00PM',
  15: '3:00PM',
  16: '4:00PM',
  17: '5:00PM',
  18: '6:00PM',
  19: '7:00PM',
  20: '8:00PM',
  21: '9:00PM',
  22: '10:00PM',
  23: '11:00PM',
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function EarningsTrendChart({
  dailyTotals,
  rangeLabel,
  chartWidth,
  isHourly,
  noCard,
}: EarningsTrendChartProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState<BarData | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const hoveredRef = useRef<string | null>(null);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [dailyTotals, fadeAnim]);

  const bars = useMemo(() => {
    if (!dailyTotals.length) return { items: [] as BarData[], maxVal: 0 };
    const sorted = [...dailyTotals].sort((a, b) => a.date.localeCompare(b.date));
    return { items: sorted, maxVal: Math.max(...sorted.map((d) => d.total), 1) };
  }, [dailyTotals]);

  const count = bars.items.length;
  const drawW = chartWidth - PAD_L;
  const colW = count > 0 ? Math.floor(drawW / count) : 0;
  const barW = Math.max(3, Math.min(14, colW - 2));

  const yLabels = useMemo(() => {
    const max = bars.maxVal;
    const raw = [max, Math.round(max / 2), 0];
    const seen = new Set<number>();
    return raw.filter((v) => {
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    });
  }, [bars.maxVal]);

  const barColor = colors.primary['600'];

  const handleBarTap = useCallback((bar: BarData, i: number) => {
    if (hoveredRef.current === bar.date) {
      setHovered(null);
      setHoverIdx(null);
      hoveredRef.current = null;
    } else {
      setHovered(bar);
      setHoverIdx(i);
      hoveredRef.current = bar.date;
    }
  }, []);

  const labelInterval = isHourly ? 3 : count > 28 ? 7 : count > 14 ? 3 : count > 7 ? 2 : 1;

  const xLabel = (b: BarData): string => {
    if (isHourly) {
      const h = new Date(b.date).getHours();
      return HOUR_LABELS[h] ?? '';
    }
    return fmtDate(b.date);
  };

  const tooltipData = hovered
    ? (() => {
        const d = new Date(hovered.date);
        if (isHourly) {
          const h = d.getHours();
          return {
            headline: formatCurrency(hovered.total),
            subtitle: HOUR_LABELS[h] ?? `${h}:00`,
            detail: `${hovered.jobs} job${hovered.jobs !== 1 ? 's' : ''}`,
          };
        }
        return {
          headline: formatCurrency(hovered.total),
          subtitle: `${d.toLocaleDateString('en-PH', { weekday: 'long' })}, ${fmtDate(hovered.date)}`,
          detail: `${hovered.jobs} job${hovered.jobs !== 1 ? 's' : ''}`,
        };
      })()
    : null;

  if (!bars.items.length) {
    const empty = (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View className="items-center justify-center" style={{ height: BAR_H }}>
          <Text className="text-[13px] text-gray-400">No data for this period</Text>
        </View>
      </Animated.View>
    );

    return noCard ? (
      <View>
        <Text className="font-heading mb-4 text-[15px]" style={{ color: colors.ui.text }}>
          {isHourly ? "Today's Earnings" : 'Daily Earnings'}
        </Text>
        {empty}
      </View>
    ) : (
      <Card className="pt-4 pb-4">
        <View className="mb-4 flex-row items-center justify-between px-1">
          <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
            {isHourly ? "Today's Earnings" : 'Daily Earnings'}
          </Text>
          <Text className="text-[11px] font-medium" style={{ color: colors.ui.textMuted }}>
            {rangeLabel}
          </Text>
        </View>
        {empty}
      </Card>
    );
  }

  const content = (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={{ flexDirection: 'row' }}>
        {/* Y-axis column */}
        <View
          style={{
            width: PAD_L,
            height: BAR_H,
            justifyContent: 'space-between',
            paddingVertical: 2,
          }}>
          {yLabels.map((v, yi) => (
            <Text
              key={`yl-${yi}`}
              className="text-[9px]"
              style={{ color: '#B0B7BF', textAlign: 'right', paddingRight: 6 }}>
              {v === 0 ? '' : formatCurrency(v)}
            </Text>
          ))}
        </View>

        {/* Chart area */}
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Bar row */}
          <View style={{ flexDirection: 'row', height: BAR_H, alignItems: 'flex-end' }}>
            {bars.items.map((b, i) => {
              const height = Math.max(2, (b.total / bars.maxVal) * BAR_H);
              return (
                <View
                  key={b.date}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <Pressable onPress={() => handleBarTap(b, i)} style={{ paddingBottom: 2 }}>
                    <View
                      style={{
                        width: barW,
                        height,
                        borderRadius: 2,
                        backgroundColor: barColor,
                      }}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* X-axis labels */}
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {bars.items.map((b, i) => {
              if (i % labelInterval !== 0) return <View key={`xs-${b.date}`} style={{ flex: 1 }} />;
              return (
                <View key={`xl-${b.date}`} style={{ flex: 1, alignItems: 'center' }}>
                  <Text className="text-[9px]" style={{ color: '#B0B7BF' }} numberOfLines={1}>
                    {xLabel(b)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Tooltip */}
          {tooltipData &&
            (() => {
              const i = hoverIdx ?? 0;
              const tipCenterFrac = (i + 0.5) / count;
              const tipW = 140;
              let left = tipCenterFrac * drawW - tipW / 2;
              if (left < 0) left = 0;
              if (left + tipW > drawW) left = drawW - tipW;

              return (
                <View
                  className="absolute rounded-xl bg-gray-900 px-3 py-2.5"
                  style={{ left, top: -4, width: tipW, zIndex: 10 }}>
                  <Text className="text-[11px] font-bold text-white">{tooltipData.headline}</Text>
                  <Text className="mt-0.5 text-[9px] text-gray-400">{tooltipData.subtitle}</Text>
                  <Text className="text-[9px] text-gray-400">{tooltipData.detail}</Text>
                </View>
              );
            })()}
        </View>
      </View>
    </Animated.View>
  );

  const header = (
    <View className="mb-4 flex-row items-center justify-between px-1">
      <Text className="font-heading text-[15px]" style={{ color: colors.ui.text }}>
        {isHourly ? "Today's Earnings" : 'Daily Earnings'}
      </Text>
      <Text className="text-[11px] font-medium" style={{ color: colors.ui.textMuted }}>
        {rangeLabel}
      </Text>
    </View>
  );

  return noCard ? (
    <View>
      {header}
      {content}
    </View>
  ) : (
    <Card className="pt-4 pb-4">
      {header}
      {content}
    </Card>
  );
}
