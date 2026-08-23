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
