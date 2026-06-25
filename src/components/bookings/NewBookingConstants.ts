import { SERVICE_CATEGORY_COLORS } from '../../constants/theme';

export interface BookingSubService {
  id: string;
  name: string;
  description: string;
  startingPrice: number;
}

export interface BookingCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  subServices: BookingSubService[];
}

export const NEW_BOOKING_CATEGORIES: BookingCategory[] = [
  {
    id: 'massage',
    name: 'Massage',
    icon: 'leaf-outline',
    color: SERVICE_CATEGORY_COLORS.massage.icon,
    bg: SERVICE_CATEGORY_COLORS.massage.bg,
    subServices: [
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
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'water-outline',
    color: SERVICE_CATEGORY_COLORS.cleaning.icon,
    bg: SERVICE_CATEGORY_COLORS.cleaning.bg,
    subServices: [
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
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: 'color-palette-outline',
    color: SERVICE_CATEGORY_COLORS.painting.icon,
    bg: SERVICE_CATEGORY_COLORS.painting.bg,
    subServices: [
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
  },
  {
    id: 'general',
    name: 'General Handyman',
    icon: 'construct-outline',
    color: SERVICE_CATEGORY_COLORS.general.icon,
    bg: SERVICE_CATEGORY_COLORS.general.bg,
    subServices: [
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
  },
];

export const NEW_BOOKING_STEPS = ['Category', 'Details', 'Schedule', 'Review'] as const;

export const NEW_BOOKING_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { label: `${h}:00 ${ampm}`, value: i };
});
