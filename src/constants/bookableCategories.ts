import { ServiceCategory } from '../types';

/**
 * The categories the MVP can actually take a booking for.
 *
 * One list, three consumers: the dashboard grid, the `search?category=` param
 * and the new-booking form. They used to disagree — the grid rendered every
 * category found in the `services` table (ten of them) while the booking form
 * carried its own hardcoded four, so Plumbing, Electrical, Carpentry, HVAC,
 * Roofing, Landscaping and Appliance Repair were advertised on the home screen
 * and could not be booked at all.
 *
 * Adding an entry here is deliberately not enough to ship it: the id union
 * below feeds a `Record<BookableCategoryId, ...>` of sub-services in
 * NEW_BOOKING_CATEGORIES, so a new category fails to compile until it has
 * something to book under it.
 */
export type BookableCategoryId = 'massage' | 'cleaning' | 'painting' | 'general';

export interface BookableCategory {
  /** Route param for `search?category=`, and the key the booking form selects on. */
  id: BookableCategoryId;
  name: string;
  icon: string;
  /** The `service_category` a booking in this category is filed under. */
  serviceCategory: ServiceCategory;
}

export const BOOKABLE_CATEGORIES: readonly BookableCategory[] = [
  {
    id: 'massage',
    name: 'Massage',
    icon: 'leaf-outline',
    // The service_category enum has no massage value; these book as general work.
    serviceCategory: ServiceCategory.General,
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'water-outline',
    serviceCategory: ServiceCategory.Cleaning,
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'color-palette-outline',
    serviceCategory: ServiceCategory.Painting,
  },
  {
    id: 'general',
    name: 'General Handyman',
    icon: 'construct-outline',
    serviceCategory: ServiceCategory.General,
  },
];

/** Resolve a route param to a bookable category, or null if it isn't one. */
export function findBookableCategory(id: string | null | undefined): BookableCategory | null {
  if (!id) return null;
  return BOOKABLE_CATEGORIES.find((category) => category.id === id) ?? null;
}

/**
 * A sub-service the client can pick, as the app declares it.
 *
 * `slug` is the key into the `services` table — migration 025 creates one row
 * per entry here. The catalog owns the price that is actually charged;
 * `fallbackPrice` is the offline-demo value only. A live booking always quotes
 * `services.base_rate`, which is what `create_booking` bills, so the two can
 * no longer disagree the way they did when the form carried its own prices.
 */
export interface BookableSubService {
  slug: string;
  name: string;
  description: string;
  fallbackPrice: number;
}

export const BOOKABLE_SUB_SERVICES: Record<BookableCategoryId, BookableSubService[]> = {
  massage: [
    {
      slug: 'massage-swedish',
      name: 'Swedish Massage',
      description: 'Full-body relaxation massage',
      fallbackPrice: 350,
    },
    {
      slug: 'massage-deep',
      name: 'Deep Tissue',
      description: 'Targets muscle knots and tension',
      fallbackPrice: 450,
    },
    {
      slug: 'massage-shiatsu',
      name: 'Shiatsu',
      description: 'Pressure-point based Japanese technique',
      fallbackPrice: 400,
    },
    {
      slug: 'massage-foot',
      name: 'Foot Reflexology',
      description: 'Focused relief for feet and legs',
      fallbackPrice: 250,
    },
  ],
  cleaning: [
    {
      slug: 'cleaning-general',
      name: 'General Cleaning',
      description: 'Sweeping, mopping, and tidying up',
      fallbackPrice: 300,
    },
    {
      slug: 'cleaning-deep',
      name: 'Deep Cleaning',
      description: 'Thorough top-to-bottom clean',
      fallbackPrice: 600,
    },
    {
      slug: 'cleaning-aircon',
      name: 'Aircon Cleaning',
      description: 'Filter wash and unit cleaning',
      fallbackPrice: 400,
    },
    {
      slug: 'cleaning-laundry',
      name: 'Laundry & Ironing',
      description: 'Wash, dry and press clothes',
      fallbackPrice: 200,
    },
  ],
  painting: [
    {
      slug: 'painting-interior',
      name: 'Interior Painting',
      description: 'Walls, ceilings, and trim indoors',
      fallbackPrice: 800,
    },
    {
      slug: 'painting-exterior',
      name: 'Exterior Painting',
      description: 'Facade, gates, and outdoor surfaces',
      fallbackPrice: 1200,
    },
    {
      slug: 'painting-touch',
      name: 'Touch-Up & Repair',
      description: 'Minor scuffs, peeling, or patches',
      fallbackPrice: 350,
    },
  ],
  general: [
    {
      slug: 'general-furniture',
      name: 'Furniture Assembly',
      description: 'Flat-pack and modular assembly',
      fallbackPrice: 300,
    },
    {
      slug: 'general-mounting',
      name: 'TV / Shelf Mounting',
      description: 'Wall-mount installation and wiring',
      fallbackPrice: 350,
    },
    {
      slug: 'general-repair',
      name: 'Minor Repairs',
      description: 'Doors, hinges, handles, and fixtures',
      fallbackPrice: 250,
    },
    {
      slug: 'general-other',
      name: 'Other',
      description: "Describe your task and we'll find the right person",
      fallbackPrice: 200,
    },
  ],
};

/** Reverse lookup: catalog slug -> the category that offers it. */
export const SLUG_TO_CATEGORY_ID: Record<string, BookableCategoryId> = Object.fromEntries(
  (Object.keys(BOOKABLE_SUB_SERVICES) as BookableCategoryId[]).flatMap((categoryId) =>
    BOOKABLE_SUB_SERVICES[categoryId].map((sub) => [sub.slug, categoryId] as const)
  )
);
