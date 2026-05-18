import { Review } from '../types';

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'r1',
    bookingId: 'b2',
    reviewerId: 'c1',
    reviewerName: 'Sarah Jenkins',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=sarah',
    revieweeId: 'h2',
    rating: 5,
    comment: 'Alex did a fantastic job painting our living room! He was quick, clean, and very professional. Highly recommended.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'r2',
    bookingId: 'b99',
    reviewerId: 'c3',
    reviewerName: 'Emily R.',
    reviewerPhotoUrl: 'https://i.pravatar.cc/150?u=emily',
    revieweeId: 'h1',
    rating: 4,
    comment: 'Mike arrived a bit late due to traffic but he fixed the plumbing issue perfectly. Good service overall.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  }
];
