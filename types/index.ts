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
  friendIds?: string[];
  badges?: Badge[];
  shareWithFriends?: boolean;
  socialPints?: number;
  totalSplits?: number;
  avgSplitScore?: number;
  bestSplitScore?: number;
  splitStreak?: number;
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
  withFriends?: string[];
  splitScore?: number;
  splitAttempted?: boolean;
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
  withFriends?: string[];
  splitScore?: number;
  splitAttempted?: boolean;
}

/**
 * Anonymized per-pub aggregate stats, publicly readable. Built by incremental
 * client-side writes from addPint/updatePint/deletePint. Contains no userIds,
 * notes, photos, or timestamps tied to specific people — only counts and averages.
 */
export interface PubStats {
  placeId: string;
  pubName: string;
  lat: number;
  lng: number;
  /** Sum of all ratings ever logged at this pub (used for incremental avg updates). */
  totalRating: number;
  pintCount: number;
  avgRating: number;
  lastUpdated: Timestamp;
}

export interface Stats {
  totalPints: number;
  uniquePubs: number;
  avgRating: number;
  bestPub: string | null;
  bestPubRating: number;
  ratingDistribution: Record<number, number>;
  dayOfWeekDistribution: Record<string, number>;
  totalSplits: number;
  avgSplitScore: number | null;
  bestSplitScore: number | null;
  splitScoreDistribution: Record<string, number>;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export type BadgeId =
  | 'first_friend'
  | 'social_pint'
  | 'round_buyer'
  | 'pub_crawlers'
  | 'the_regular'
  | 'social_butterfly'
  | 'first_split'
  | 'perfect_split'
  | 'split_streak'
  | 'split_master'
  | 'g_whiz';

export interface Badge {
  id: BadgeId;
  earnedAt: Timestamp;
}

export const BADGE_CONFIG: Record<
  BadgeId,
  { name: string; description: string; icon: string; color: string }
> = {
  first_friend: {
    name: 'First Round',
    description: 'Connect your first friend',
    icon: '🤝',
    color: '#c9a84c',
  },
  social_pint: {
    name: 'Social Pint',
    description: 'Log a pint with a friend',
    icon: '🍺',
    color: '#4a7c59',
  },
  round_buyer: {
    name: 'Round Buyer',
    description: 'Tag 3+ friends in one pint',
    icon: '🫗',
    color: '#2196F3',
  },
  pub_crawlers: {
    name: 'Pub Crawlers',
    description: 'Log 5 pints with friends',
    icon: '🗺️',
    color: '#FF9800',
  },
  the_regular: {
    name: 'The Regular',
    description: 'Log 10 pints with friends',
    icon: '⭐',
    color: '#9C27B0',
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Connect 5 friends',
    icon: '🦋',
    color: '#E91E63',
  },
  first_split: {
    name: 'First Split',
    description: 'Attempt your first Split the G',
    icon: '🎯',
    color: '#4CAF50',
  },
  perfect_split: {
    name: 'Perfect Split',
    description: 'Score 95+ on a split',
    icon: '💎',
    color: '#00BCD4',
  },
  split_streak: {
    name: 'Hot Streak',
    description: '5 consecutive splits scoring 70+',
    icon: '🔥',
    color: '#FF5722',
  },
  split_master: {
    name: 'Split Master',
    description: 'Average 80+ over 10+ attempts',
    icon: '👑',
    color: '#FFD700',
  },
  g_whiz: {
    name: 'G Whiz',
    description: '25 total split attempts',
    icon: '🏆',
    color: '#9C27B0',
  },
};

export const ALL_BADGE_IDS: BadgeId[] = [
  'first_friend',
  'social_pint',
  'round_buyer',
  'pub_crawlers',
  'the_regular',
  'social_butterfly',
  'first_split',
  'perfect_split',
  'split_streak',
  'split_master',
  'g_whiz',
];
