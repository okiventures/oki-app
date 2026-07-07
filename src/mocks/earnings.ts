import { EarningsEntry, PayoutStatus, ServiceCategory } from '../types';

const ALL_CATEGORIES = [
  ServiceCategory.Plumbing,
  ServiceCategory.Electrical,
  ServiceCategory.Carpentry,
  ServiceCategory.Cleaning,
  ServiceCategory.Painting,
  ServiceCategory.HVAC,
  ServiceCategory.Roofing,
  ServiceCategory.Landscaping,
  ServiceCategory.Appliance,
  ServiceCategory.General,
];

const CLIENT_NAMES = [
  'Ishah Bautista',
  'Kyle Lee',
  'Princess Jaena',
  'Mara Sy',
  'Angel Cruz',
  'Ramon Santos',
  'Diana Mercado',
  'Lito Villanueva',
];

const BASE_AMOUNTS: Record<string, number> = {
  [ServiceCategory.Plumbing]: 120,
  [ServiceCategory.Electrical]: 200,
  [ServiceCategory.Carpentry]: 180,
  [ServiceCategory.Cleaning]: 150,
  [ServiceCategory.Painting]: 300,
  [ServiceCategory.HVAC]: 350,
  [ServiceCategory.Roofing]: 500,
  [ServiceCategory.Landscaping]: 250,
  [ServiceCategory.Appliance]: 130,
  [ServiceCategory.General]: 100,
};

/* Weighted hour distribution: peak 8AM–5PM, tapered mornings/evenings (normalized to sum 1.0) */
const HOUR_WEIGHTS = [
  0.014, 0.007, 0.007, 0.007, 0.007, 0.014, 0.027, 0.047, 0.068, 0.088, 0.081, 0.074, 0.047, 0.068,
  0.081, 0.088, 0.074, 0.054, 0.041, 0.034, 0.027, 0.02, 0.014, 0.014,
];
const HOUR_CUMULATIVE = HOUR_WEIGHTS.reduce<number[]>(
  (acc, w) => (acc.push((acc[acc.length - 1] ?? 0) + w), acc),
  []
);

/* Status weights: ~88% Completed, 5% Cancelled (as Failed), 4% Pending, 3% Failed */
const STATUS_WEIGHTS = [
  { status: PayoutStatus.Completed, weight: 0.88 },
  { status: PayoutStatus.Failed, weight: 0.05 },
  { status: PayoutStatus.Pending, weight: 0.04 },
  { status: PayoutStatus.Processing, weight: 0.03 },
];
const STATUS_CUMULATIVE = STATUS_WEIGHTS.reduce<number[]>(
  (acc, s) => (acc.push((acc[acc.length - 1] ?? 0) + s.weight), acc),
  []
);

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pickWeighted(seed: number, weights: number[]): number {
  const r = seededRandom(seed);
  for (let i = 0; i < weights.length; i++) {
    if (r <= weights[i]) return i;
  }
  return weights.length - 1;
}

function generateHour(seed: number): number {
  return pickWeighted(seed, HOUR_CUMULATIVE);
}

function pickStatus(seed: number): PayoutStatus {
  return STATUS_WEIGHTS[pickWeighted(seed, STATUS_CUMULATIVE)].status;
}

function generateDailyEntries(): EarningsEntry[] {
  const entries: EarningsEntry[] = [];
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 179);
  let entryCounter = 1;
  let bookingCounter = 3000;

  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dayOffset);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    /* ~50% growth over 6 months */
    const growthFactor = 1 + (dayOffset / totalDays) * 0.5;

    /* Base jobs by weekday: Sun 1.5, Mon 3.5, Tue 4, Wed 5, Thu 4.5, Fri 4, Sat 2.5 */
    const weekdayRates = [1.5, 3.5, 4, 5, 4.5, 4, 2.5];
    const baseJobs = weekdayRates[dayOfWeek];
    const variance = seededRandom(dayOffset * 7 + 1) * 2 - 1;
    const jobCount = Math.max(1, Math.round(baseJobs + variance * 1.5));

    /* End-of-month busy spike */
    const isEndOfMonth = d.getDate() >= 25 && seededRandom(dayOffset * 11) > 0.5;
    /* Mid-month quiet period */
    const isQuietPeriod =
      d.getDate() >= 10 && d.getDate() <= 14 && seededRandom(dayOffset * 19) > 0.7;
    /* Random big day (1–5 extra jobs) */
    const isBigDay = seededRandom(dayOffset * 13) > 0.88;
    /* Recent days get a boost so "This Day" / "This Week" views look fuller */
    const daysFromEnd = totalDays - 1 - dayOffset;
    const recencyBoost = daysFromEnd < 3 ? 3 - daysFromEnd : 0;

    let finalJobs = jobCount + recencyBoost;
    if (isEndOfMonth) finalJobs += Math.floor(seededRandom(dayOffset * 23) * 2) + 1;
    if (isBigDay) finalJobs += Math.floor(seededRandom(dayOffset * 17) * 3) + 1;
    if (isQuietPeriod) finalJobs = Math.max(1, finalJobs - 2);

    for (let j = 0; j < finalJobs; j++) {
      const seed = dayOffset + j * 999;

      /* Category mix: shifts from general toward specialized over time */
      const catShift = (dayOffset / totalDays) * 0.25;
      const catRand = seededRandom(seed) + catShift;
      const catIdx = Math.min(
        ALL_CATEGORIES.length - 1,
        Math.floor(catRand * ALL_CATEGORIES.length)
      );
      const cat = ALL_CATEGORIES[catIdx];

      /* Is this a big project? ~3% chance, 2–4× base */
      const isBigProject = seededRandom(seed + 5555) > 0.97;
      const bigProjectMultiplier = isBigProject ? 2 + Math.floor(seededRandom(seed + 6666) * 3) : 1;

      const base = (BASE_AMOUNTS[cat] ?? 150) * growthFactor * bigProjectMultiplier;
      const amtVar = Math.round(seededRandom(seed + 7777) * 80 - 40);
      const grossAmount = Math.max(60, Math.round(base + amtVar));

      const status = pickStatus(seed + 8888);

      /* Cancelled / failed entries have 0 or minimal pay */
      let finalGross = grossAmount;
      let finalFee = Math.round(grossAmount * 0.1);
      if (status === 'Failed') {
        finalGross = 0;
        finalFee = 0;
      }

      const netEarnings = finalGross - finalFee;

      const hour = generateHour(seed + 333);
      const minute = Math.floor(seededRandom(seed + 444) * 60);
      const dateWithHour = new Date(d);
      dateWithHour.setHours(hour, minute);
      /* Weekend work skews to morning (emergency calls) */
      if (isWeekend && hour > 12) {
        dateWithHour.setHours(Math.floor(hour * 0.6));
      }

      const clientIdx = Math.floor(seededRandom(seed + 1111) * CLIENT_NAMES.length);

      entries.push({
        id: `earn-${String(entryCounter).padStart(4, '0')}`,
        bookingId: `BK-2026-${bookingCounter}`,
        clientName: CLIENT_NAMES[clientIdx],
        serviceCategory: cat,
        grossAmount: finalGross,
        platformFee: finalFee,
        netEarnings,
        status: status as EarningsEntry['status'],
        date: dateWithHour.toISOString(),
      });

      entryCounter++;
      bookingCounter++;
    }
  }

  return entries;
}

export const MOCK_EARNINGS = generateDailyEntries();

export function fillDailyTotals(
  dailyTotals: { date: string; total: number; jobs: number }[],
  rangeStart: Date,
  rangeEnd: Date
): { date: string; total: number; jobs: number }[] {
  const map = new Map(dailyTotals.map((d) => [d.date, d]));
  const filled: { date: string; total: number; jobs: number }[] = [];
  const cur = new Date(rangeStart);
  const end = new Date(rangeEnd);
  while (cur <= end) {
    const key = localDateStr(cur);
    filled.push(map.get(key) ?? { date: key, total: 0, jobs: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return filled;
}

export function getEarningsSummary(entries: EarningsEntry[]) {
  return {
    totalNet: entries.reduce((sum, e) => sum + e.netEarnings, 0),
    totalGross: entries.reduce((sum, e) => sum + e.grossAmount, 0),
    totalFees: entries.reduce((sum, e) => sum + e.platformFee, 0),
    jobCount: entries.length,
  };
}

export function filterEarningsByRange(
  entries: EarningsEntry[],
  startDate: Date,
  endDate: Date
): EarningsEntry[] {
  const start = startDate.getTime();
  const end = endDate.getTime() + 86400000;
  return entries.filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= start && t < end;
  });
}

export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getHourlyAggregates(
  entries: EarningsEntry[]
): { hour: number; label: string; total: number; jobs: number }[] {
  const map = new Map<number, { total: number; jobs: number }>();
  for (const e of entries) {
    const h = new Date(e.date).getHours();
    const prev = map.get(h) ?? { total: 0, jobs: 0 };
    map.set(h, { total: prev.total + e.netEarnings, jobs: prev.jobs + 1 });
  }
  const labels: Record<number, string> = {
    0: '12AM',
    1: '1AM',
    2: '2AM',
    3: '3AM',
    4: '4AM',
    5: '5AM',
    6: '6AM',
    7: '7AM',
    8: '8AM',
    9: '9AM',
    10: '10AM',
    11: '11AM',
    12: '12PM',
    13: '1PM',
    14: '2PM',
    15: '3PM',
    16: '4PM',
    17: '5PM',
    18: '6PM',
    19: '7PM',
    20: '8PM',
    21: '9PM',
    22: '10PM',
    23: '11PM',
  };
  return Array.from(map.entries())
    .map(([hour, data]) => ({ hour, label: labels[hour] ?? `${hour}`, ...data }))
    .sort((a, b) => a.hour - b.hour);
}

export function getDailyAggregates(
  entries: EarningsEntry[]
): { date: string; total: number; jobs: number }[] {
  const map = new Map<string, { total: number; jobs: number }>();
  for (const e of entries) {
    const day = localDateStr(new Date(e.date));
    const prev = map.get(day) ?? { total: 0, jobs: 0 };
    map.set(day, { total: prev.total + e.netEarnings, jobs: prev.jobs + 1 });
  }
  return Array.from(map.entries())
    .map(([date, data]) => ({ date, total: data.total, jobs: data.jobs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function fillHourlyTotals(
  entries: EarningsEntry[]
): { date: string; total: number; jobs: number }[] {
  const hourly = getHourlyAggregates(entries);
  const map = new Map(hourly.map((h) => [h.hour, h]));
  const filled: { date: string; total: number; jobs: number }[] = [];
  for (let h = 0; h <= 23; h++) {
    const existing = map.get(h);
    const hh = String(h).padStart(2, '0');
    filled.push({
      date: '1970-01-01T' + hh + ':00:00.000Z',
      total: existing?.total ?? 0,
      jobs: existing?.jobs ?? 0,
    });
  }
  return filled;
}

export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  return { start, end };
}

export function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function getThisMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

export function getLastMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start, end };
}

export function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.toLocaleDateString('en-PH', opts)} – ${end.getDate()}`;
  }
  return `${start.toLocaleDateString('en-PH', opts)} – ${end.toLocaleDateString('en-PH', opts)}`;
}

export function getRangeLabel(preset: string, start: Date, end: Date): string {
  const range = formatDateRange(start, end);
  switch (preset) {
    case 'This Day':
      return `Today \u00B7 ${range}`;
    case 'This Week':
      return `This Week \u00B7 ${range}`;
    case 'This Month':
      return `This Month \u00B7 ${range}`;
    case 'Last Month':
      return `Last Month \u00B7 ${range}`;
    default:
      return `${range}`;
  }
}
