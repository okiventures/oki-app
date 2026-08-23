import { supabase } from '../lib/supabase';
import { SERVICE_CATEGORY_COLORS } from '../constants/theme';
import {
  BOOKABLE_CATEGORIES,
  BOOKABLE_SUB_SERVICES,
  SLUG_TO_CATEGORY_ID,
  type BookableCategory,
  type BookableCategoryId,
} from '../constants/bookableCategories';
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

/**
 * A sub-service, priced by the catalog.
 *
 * `price` is `services.base_rate` — the same number `create_booking` charges.
 * The booking form used to advertise a hardcoded constant instead and map
 * fifteen sub-services onto three catalog rows, so the quote and the charge
 * disagreed on fourteen of fifteen. Quote from this and they cannot.
 */
export interface BookableService {
  /** `services.id`. Empty in mock mode, where there is nothing to book against. */
  id: string;
  slug: string;
  categoryId: BookableCategoryId;
  name: string;
  description: string;
  price: number;
}

/**
 * Every bookable sub-service, priced from the catalog.
 *
 * A slug the app offers but the catalog does not carry is dropped rather than
 * shown at a guessed price — an unbookable option is better than a wrong one.
 */
export async function fetchBookableServices(): Promise<BookableService[]> {
  const slugs = Object.keys(SLUG_TO_CATEGORY_ID);

  if (isMockEnv()) {
    return (Object.keys(BOOKABLE_SUB_SERVICES) as BookableCategoryId[]).flatMap((categoryId) =>
      BOOKABLE_SUB_SERVICES[categoryId].map((sub) => ({
        id: '',
        slug: sub.slug,
        categoryId,
        name: sub.name,
        description: sub.description,
        price: sub.fallbackPrice,
      }))
    );
  }

  const { data, error } = await supabase
    .from('services')
    .select('id, slug, name, description, base_rate')
    .in('slug', slugs)
    .eq('is_active', true);

  if (error) throw new Error(`Failed to fetch bookable services: ${error.message}`);

  const rows = (data ?? []) as {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    base_rate: number | string;
  }[];

  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  // Ordered by the app's list, not the catalog's, so the menu keeps its
  // intended order regardless of insertion order in the database.
  return slugs.flatMap((slug) => {
    const row = bySlug.get(slug);
    if (!row) return [];

    return [
      {
        id: row.id,
        slug: row.slug,
        categoryId: SLUG_TO_CATEGORY_ID[slug],
        name: row.name,
        description: row.description ?? '',
        price: Number(row.base_rate),
      },
    ];
  });
}
