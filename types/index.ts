import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
  totalPints: number;
  avgRating: number;
  homePub?: string;
  photoURL?: string;
}

export interface Pint {
  id: string;
  userId: string;
  pubName: string;
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  rating: number;
  tags: string[];
  note: string;
  photoUrl?: string;
  createdAt: Timestamp;
}

export type PintTag =
  | 'Perfect Head'
  | 'Creamy'
  | 'Bitter'
  | 'Smooth'
  | 'Cold'
  | 'Lukewarm'
  | 'Well-poured'
  | 'Flat'
  | 'Hazy'
  | 'Lively';

export const ALL_TAGS: PintTag[] = [
  'Perfect Head',
  'Creamy',
  'Bitter',
  'Smooth',
  'Cold',
  'Lukewarm',
  'Well-poured',
  'Flat',
  'Hazy',
  'Lively',
];

export interface PintFormData {
  pubName: string;
  address: string;
  placeId: string;
  lat: number;
  lng: number;
  rating: number;
  tags: string[];
  note: string;
  photo?: File;
}

export interface Stats {
  totalPints: number;
  uniquePubs: number;
  avgRating: number;
  bestPub: string | null;
  bestPubRating: number;
  ratingDistribution: Record<number, number>;
  dayOfWeekDistribution: Record<string, number>;
}
