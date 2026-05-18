import { UserType, MembershipTier } from '../types';

export const MOCK_CLIENT = {
  id: 'c1',
  name: 'Sarah Jenkins',
  type: 'client' as UserType,
  photoUrl: 'https://i.pravatar.cc/150?u=sarah',
  rating: 4.8,
  reviewCount: 12,
  memberSince: '2023-01-15T08:00:00Z',
  location: 'Downtown Metro',
};

export const MOCK_HANDYMAN = {
  id: 'h1',
  name: 'Mike Torres',
  type: 'handyman' as UserType,
  photoUrl: 'https://i.pravatar.cc/150?u=mike',
  rating: 4.9,
  reviewCount: 142,
  memberSince: '2021-06-22T08:00:00Z',
  location: 'Westside Area',
  isVerified: true,
  isOnline: true,
  membershipTier: MembershipTier.Gold,
  jobsCompleted: 318,
  skills: ['Plumbing', 'Electrical', 'General Handyman'],
  bio: 'Licensed plumber and electrician with over 10 years of experience. I fix things right the first time.',
  hourlyRate: 45,
};
