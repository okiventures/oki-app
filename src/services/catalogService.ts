import { supabase } from '../lib/supabase';
import { SERVICE_CATEGORY_COLORS } from '../constants/theme';
import { BOOKABLE_CATEGORIES, type BookableCategory } from '../constants/bookableCategories';
import { isMockEnv } from './bookingService';

/**
 * A bookable category, ready to render.
 *
 * Icons and colours stay in code — they are presentation, and putting them in
 * the database would mean a migration every time a swatch changes.
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

function toTile(category: BookableCategory): ServiceCategoryTile {
  const palette = SERVICE_CATEGORY_COLORS[category.id] ?? FALLBACK_PALETTE;

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    iconColor: palette.icon,
    bgColor: palette.bg,
    borderColor: palette.border,
  };
}

/**
 * The MVP categories that the catalog can currently serve.
 *
 * This used to return every distinct `services.category`, which is how the grid
 * came to advertise seven categories the booking form has no sub-services for.
 * It now starts from BOOKABLE_CATEGORIES and intersects with the catalog, so a
 * tile is only shown when the app can take the booking *and* there is an active
 * service behind it.
 */
export async function fetchServiceCategories(): Promise<ServiceCategoryTile[]> {
  // Mock mode has no services table to intersect against.
  if (isMockEnv()) {
    return BOOKABLE_CATEGORIES.map(toTile);
  }

  const { data, error } = await supabase.from('services').select('category');

  if (error) throw new Error(`Failed to fetch service categories: ${error.message}`);

  const available = new Set((data ?? []).map((row: { category: string }) => row.category));

  return BOOKABLE_CATEGORIES.filter((category) => available.has(category.serviceCategory)).map(
    toTile
  );
}
