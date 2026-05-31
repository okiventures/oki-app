import { Ionicons } from '@expo/vector-icons';

import { ServiceCategory } from '../../../types';

export const ONBOARDING_STEPS = ['Profile', 'Services', 'Documents', 'Pending'] as const;

export type HandymanOnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const SERVICE_OPTIONS: {
  category: ServiceCategory;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
}[] = [
  {
    category: ServiceCategory.Plumbing,
    icon: 'water-outline',
    hint: 'Pipe leaks, sink installs, and bathroom repairs.',
  },
  {
    category: ServiceCategory.Electrical,
    icon: 'flash-outline',
    hint: 'Outlets, breakers, and lighting fixes.',
  },
  {
    category: ServiceCategory.Carpentry,
    icon: 'hammer-outline',
    hint: 'Shelves, cabinets, and wood repairs.',
  },
  {
    category: ServiceCategory.Cleaning,
    icon: 'sparkles-outline',
    hint: 'Deep cleaning and move-out service requests.',
  },
  {
    category: ServiceCategory.Appliance,
    icon: 'settings-outline',
    hint: 'Basic appliance diagnostics and repair visits.',
  },
  {
    category: ServiceCategory.General,
    icon: 'construct-outline',
    hint: 'Mixed odd jobs and home maintenance work.',
  },
];

export const DOCUMENT_OPTIONS = [
  {
    id: 'government-id',
    title: 'Government ID',
    subtitle: 'Front of UMID, passport, or driver\'s license.',
    icon: 'card-outline',
  },
  {
    id: 'selfie',
    title: 'Selfie with ID',
    subtitle: 'Hold your ID beside your face for matching.',
    icon: 'camera-outline',
  },
  {
    id: 'proof-of-address',
    title: 'Proof of address',
    subtitle: 'Recent utility bill or barangay certificate.',
    icon: 'home-outline',
  },
] as const;

export type DocumentId = (typeof DOCUMENT_OPTIONS)[number]['id'];

export type UploadState = {
  fileName: string;
  mimeType: string | null;
  progress: number;
  uri: string;
};