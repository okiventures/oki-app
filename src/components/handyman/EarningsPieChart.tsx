import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils';
import { CATEGORY_ORDER, CATEGORY_COLORS } from '../../constants/categories';

interface PieSlice {
  label: string;
  value: number;
  color?: string;
}

interface SvgSlice extends PieSlice {
  path: string;
  pct: number;
}

interface EarningsPieChartProps {
  slices: PieSlice[];
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

export function EarningsPieChart({ slices }: EarningsPieChartProps) {
  const { colors } = useTheme();
  const { width: sw } = useWindowDimensions();
  const chartSize = Math.min(sw - 64, 280);
  const r = chartSize * 0.42;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  const ordered: SvgSlice[] = CATEGORY_ORDER.map((cat, idx) => {
    const found = slices.find((s) => s.label === cat);
    return {
      label: cat,
      value: found?.value ?? 0,
      color: CATEGORY_COLORS[cat],
      path: '',
      pct: 0,
    };
  }).filter((s) => s.value > 0);

  const others = slices
    .filter((s) => !CATEGORY_ORDER.includes(s.label) && s.value > 0)
    .reduce((sum, s) => sum + s.value, 0);

  if (others > 0) {
    ordered.push({ label: 'Other', value: others, color: '#9CA3AF', path: '', pct: 0 });
  }

  const legend = [...ordered].sort((a, b) => b.value - a.value);

  let angle = 0;
  for (const sl of ordered) {
    const frac = total > 0 ? sl.value / total : 0;
    const sweep = frac * 360;
    sl.path = describeArc(cx, cy, r, angle, angle + sweep);
    sl.pct = frac * 100;
    angle += sweep;
  }

  const body = !ordered.length ? (
    <View className="items-center justify-center" style={{ height: 140 }}>
      <Text className="text-[13px]" style={{ color: colors.ui.textMuted }}>
        No data for this period
      </Text>
    </View>
  ) : (
    <View className="items-center">
      <View style={{ position: 'relative', width: chartSize, height: chartSize }}>
        <Svg width={chartSize} height={chartSize}>
          {ordered.map((p) => (
            <Path key={p.label} d={p.path} fill={p.color} opacity={0.85} />
          ))}
          <Circle cx={cx} cy={cy} r={r * 0.55} fill={colors.ui.surface} />
        </Svg>
        <View
          className="absolute items-center justify-center"
          style={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <Text className="font-heading text-lg" style={{ color: colors.ui.text }}>
            {formatCurrency(total)}
          </Text>
          <Text className="text-[10px] font-medium" style={{ color: colors.ui.textMuted }}>
            Total
          </Text>
        </View>
      </View>

      <View className="mt-4 w-full gap-2.5">
        {legend.map((item) => {
          const pct = Math.round(item.pct);
          return (
            <View key={item.label} className="flex-row items-center gap-2.5">
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <Text
                className="flex-1 text-[12px] font-medium"
                style={{ color: colors.ui.text }}
                numberOfLines={1}>
                {item.label}
              </Text>
              <Text className="text-[12px] font-semibold" style={{ color: colors.ui.text }}>
                {formatCurrency(item.value)}
              </Text>
              <Text className="w-8 text-right text-[11px]" style={{ color: colors.ui.textMuted }}>
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
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
      <Text className="font-heading mb-4 text-[15px]" style={{ color: colors.ui.text }}>
        Earnings Mix
      </Text>
      {body}
    </View>
  );
}
