import { SERVICE_CATEGORY_COLORS } from '../../constants/theme';
import { BOOKABLE_CATEGORIES, type BookableCategoryId } from '../../constants/bookableCategories';

export interface BookingSubService {
  id: string;
  name: string;
  description: string;
  startingPrice: number;
}

export interface BookingCategory {
  id: BookableCategoryId;
  name: string;
  icon: string;
  color: string;
  bg: string;
  subServices: BookingSubService[];
}

// Keyed by BookableCategoryId, so a category added to BOOKABLE_CATEGORIES fails
// to compile until it has something bookable underneath it. That mismatch is
// exactly what let the dashboard advertise seven categories this form could not
// accept.
const SUB_SERVICES: Record<BookableCategoryId, BookingSubService[]> = {
  massage: [
    {
      id: 'massage-swedish',
      name: 'Swedish Massage',
      description: 'Full-body relaxation massage',
      startingPrice: 350,
    },
    {
      id: 'massage-deep',
      name: 'Deep Tissue',
      description: 'Targets muscle knots and tension',
      startingPrice: 450,
    },
    {
      id: 'massage-shiatsu',
      name: 'Shiatsu',
      description: 'Pressure-point based Japanese technique',
      startingPrice: 400,
    },
    {
      id: 'massage-foot',
      name: 'Foot Reflexology',
      description: 'Focused relief for feet and legs',
      startingPrice: 250,
    },
  ],
  cleaning: [
    {
      id: 'cleaning-general',
      name: 'General Cleaning',
      description: 'Sweeping, mopping, and tidying up',
      startingPrice: 300,
    },
    {
      id: 'cleaning-deep',
      name: 'Deep Cleaning',
      description: 'Thorough top-to-bottom clean',
      startingPrice: 600,
    },
    {
      id: 'cleaning-aircon',
      name: 'Aircon Cleaning',
      description: 'Filter wash and unit cleaning',
      startingPrice: 400,
    },
    {
      id: 'cleaning-laundry',
      name: 'Laundry & Ironing',
      description: 'Wash, dry and press clothes',
      startingPrice: 200,
    },
  ],
  painting: [
    {
      id: 'painting-interior',
      name: 'Interior Painting',
      description: 'Walls, ceilings, and trim indoors',
      startingPrice: 800,
    },
    {
      id: 'painting-exterior',
      name: 'Exterior Painting',
      description: 'Facade, gates, and outdoor surfaces',
      startingPrice: 1200,
    },
    {
      id: 'painting-touch',
      name: 'Touch-Up & Repair',
      description: 'Minor scuffs, peeling, or patches',
      startingPrice: 350,
    },
  ],
  general: [
    {
      id: 'general-furniture',
      name: 'Furniture Assembly',
      description: 'Flat-pack and modular assembly',
      startingPrice: 300,
    },
    {
      id: 'general-mounting',
      name: 'TV / Shelf Mounting',
      description: 'Wall-mount installation and wiring',
      startingPrice: 350,
    },
    {
      id: 'general-repair',
      name: 'Minor Repairs',
      description: 'Doors, hinges, handles, and fixtures',
      startingPrice: 250,
    },
    {
      id: 'general-other',
      name: 'Other',
      description: "Describe your task and we'll find the right person",
      startingPrice: 200,
    },
  ],
};

export const NEW_BOOKING_CATEGORIES: BookingCategory[] = BOOKABLE_CATEGORIES.map((category) => {
  const palette = SERVICE_CATEGORY_COLORS[category.id];

  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: palette.icon,
    bg: palette.bg,
    subServices: SUB_SERVICES[category.id],
  };
});

export const NEW_BOOKING_STEPS = ['Category', 'Details', 'Schedule', 'Review'] as const;

export const NEW_BOOKING_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { label: `${h}:00 ${ampm}`, value: i };
});
