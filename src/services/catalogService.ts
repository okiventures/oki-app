import { supabase } from '../lib/supabase';
import { SERVICE_CATEGORY_COLORS, SERVICE_CATEGORY_ICONS } from '../constants/theme';
import { isMockEnv } from './bookingService';

/**
 * A bookable category, ready to render.
 *
 * The category list comes from the `services` table so the grid only offers
 * work someone can actually book. Icons and colours stay in code — they are
 * presentation, and putting them in the database would mean a migration every
 * time a swatch changes.
 */
export interface ServiceCategoryTile {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}

const FALLBACK_PALETTE = { icon: '#334155', bg: '#F8FAFC', border: '#E2E8F0' };

function toTile(category: string): ServiceCategoryTile {
  const palette = SERVICE_CATEGORY_COLORS[category] ?? FALLBACK_PALETTE;

  return {
    id: category.toLowerCase().replace(/\s+/g, '-'),
    name: category,
    icon: SERVICE_CATEGORY_ICONS[category] ?? 'construct-outline',
    iconColor: palette.icon,
    bgColor: palette.bg,
    borderColor: palette.border,
  };
}

/** Every category that has at least one active service, in catalog order. */
export async function fetchServiceCategories(): Promise<ServiceCategoryTile[]> {
  if (isMockEnv()) {
    const { MOCK_DASHBOARD_CATEGORIES } = await import('../mocks');
    return MOCK_DASHBOARD_CATEGORIES;
  }

  const { data, error } = await supabase.from('services').select('category').order('category');

  if (error) throw new Error(`Failed to fetch service categories: ${error.message}`);

  // Several services share a category, so de-duplicate rather than asking
  // PostgREST for a distinct it cannot express.
  const seen = new Set<string>();
  const tiles: ServiceCategoryTile[] = [];

  for (const row of (data ?? []) as { category: string }[]) {
    if (seen.has(row.category)) continue;
    seen.add(row.category);
    tiles.push(toTile(row.category));
  }

  return tiles;
}
