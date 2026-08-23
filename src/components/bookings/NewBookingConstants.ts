import { SERVICE_CATEGORY_COLORS } from '../../constants/theme';
import { BOOKABLE_CATEGORIES, type BookableCategoryId } from '../../constants/bookableCategories';

export interface BookingCategory {
  id: BookableCategoryId;
  name: string;
  icon: string;
  color: string;
  bg: string;
}

// Presentation only. Sub-services and their prices come from the catalog via
// useBookableServices — a second hardcoded price list here is exactly what let
// the form advertise a number the server did not charge.
export const NEW_BOOKING_CATEGORIES: BookingCategory[] = BOOKABLE_CATEGORIES.map((category) => {
  const palette = SERVICE_CATEGORY_COLORS[category.id];

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: palette.icon,
    bg: palette.bg,
  };
});

export const NEW_BOOKING_STEPS = ['Category', 'Details', 'Schedule', 'Review'] as const;

export const NEW_BOOKING_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { label: `${h}:00 ${ampm}`, value: i };
});
