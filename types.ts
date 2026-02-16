export interface Content {
  id: string;
  title: string;
  overview: string;
  poster_path: string;
  poster_path_mobile?: string; // Optional mobile-optimized poster
  backdrop_path: string;
  backdrop_path_mobile?: string; // Optional mobile-optimized backdrop
  youtubeId: string;
  movieDriveId?: string;
  movieYoutubeId?: string; // Main movie can be on YouTube too
  videoUrl?: string; // Direct video URL for player (decoupled from download)
  allowDownload?: boolean;
  allowPlayback?: boolean;
  isPublished?: boolean;
  type: 'movie' | 'tv' | 'sparks' | 'sports' | 'short' | 'trailer';
  genres: string[];
  release_date: string;
  vote_average: number;
  featured?: boolean;
  createdAt: string;
  cast?: string[];
  tags?: string[];
  comingSoon?: boolean;
  progress?: number;
  duration?: number | string;
  stoppedAt?: number;
  playMode?: 'trailer' | 'movie';
  accessCode?: string; // Private content requiring code
  seasons?: Season[];
  rating?: string; // Censor rating e.g. U/A 16+
  year?: number;
  matchInfo?: any;
  resolution?: 'HD' | '4K' | 'SD';
  isOriginal?: boolean;
  episodes?: Episode[];
  director?: string; // Single director for movies
  creators?: string[]; // Multiple creators/showrunners for TV
  reviews?: { userId: string; rating: number; comment: string; date: string }[];
  downloadLinks?: DownloadLink[];
}

export interface DownloadLink {
  label: string; // e.g. "1080p", "4K", "Server 1"
  url: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  overview?: string; // Optional description per episode
  driveId?: string; // Drive source
  youtubeId?: string; // YouTube source
  videoUrl?: string; // Direct video URL for player
  duration?: string; // e.g., "45m"
  stillUrl?: string; // Thumbnail for episode
  downloadLinks?: DownloadLink[];
}

export interface Season {
  id: string;
  seasonNumber: number;
  title: string; // e.g. "Season 1"
  trailerYoutubeId?: string; // Trailer specific to this season
  episodes: Episode[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  image?: string;
  type: 'content' | 'system';
  link?: string;
  createdAt: string;
  read?: boolean;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  type: 'trending' | 'genre' | 'curated' | 'originals' | 'new_movies' | 'new_tv';
  genreFilter?: string;
  contentIds?: string[];
  enabled: boolean;
  scopes: ('home' | 'tv' | 'movie' | 'new')[];
  showRanking?: boolean;
}

export interface SiteSettings {
  siteName: string;
  heroContentId?: string;
  heroVideoQuality?: 'auto' | 'hd720' | 'hd1080' | 'highres';
  maintenanceMode: boolean;
  contactEmail?: string;
  theme?: 'default' | 'luxury';
  websiteFont?: string;
  rankFont?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  interval?: 'monthly' | 'yearly';
  razorpayPlanId?: string;
  features: string[];
  active?: boolean;
  quality: 'Good' | 'Better' | 'Best';
  resolution: '720p' | '1080p' | '4K +HDR';
  period?: string;
  maxDevices?: number;
  ads?: boolean;
}

export interface Subscription {
  id: string;
  uid: string;
  planId: string;
  razorpaySubscriptionId: string;
  status: 'active' | 'created' | 'authenticated' | 'expired' | 'halted' | 'cancelled';
  currentPeriodStart: number;
  currentPeriodEnd: number;
}

export interface User {
  uid: string;
  email: string;
  name?: string;
  razorpayCustomerId?: string;
  plan: string;
  subscriptionStatus?: 'active' | 'inactive' | 'canceled';
  role?: 'user' | 'admin' | 'guest';
  status?: 'active' | 'blocked';
  lastLoginAt?: string;
  lastLogoutAt?: string;
  lastActiveAt?: string;
  totalWatchTime?: number;
  continueWatching?: ContinueWatchingItem[];
  tokenVersion?: number;
  lowDataMode?: boolean;
  autoplayEnabled?: boolean; // Controls hero video autoplay - default false on mobile
  readNotifications?: string[];
  autoFullscreen?: boolean; // User preference for auto-fullscreen
  isGuest?: boolean;
  createdAt?: string;
}

export interface ContinueWatchingItem {
  movieId: string;
  progress: number;
  lastWatchedAt: string;
  stoppedAt: number;
  duration: number;
}

export interface ViewingLog {
  id?: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'trailer';
  genre: string[];
  startedAt: string;
  endedAt?: string;
  watchDurationSeconds: number;
}

export interface DownloadLog {
  id: string;
  userId: string;
  contentId: string;
  downloadedAt: any;
  status: 'completed' | 'failed' | 'deleted';
  fileSize: number;
}

// UI & Layout Types
export interface InfoPageData {
  id?: string;
  title: string;
  description: string;
  sections: {
    heading: string;
    content?: string;
    listItems?: string[];
    steps?: string[];
    buttonLabel?: string;
    buttonLink?: string;
  }[];
  category?: 'Company' | 'Support' | 'Legal' | 'Connect';
  lastUpdated?: string;
}

// Account & Billing Types
export interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'paypal';
  last4: string;
  expiryDate?: string; // MM/YY
  brand?: string; // Visa, MasterCard
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  date: string; // ISO String
  status: 'paid' | 'pending' | 'failed';
  planName: string;
  periodStart: string;
  periodEnd: string;
  pdfUrl?: string;
}

export interface Device {
  id: string;
  name: string; // "Chrome on Windows"
  type: 'mobile' | 'tablet' | 'desktop' | 'tv';
  lastActiveAt: string;
  ipAddress?: string;
  isCurrent?: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  isKids: boolean;
  myList: string[];
  unlockedContent?: string[];
  subscription?: Subscription;
}

export enum ContentType {
  MOVIE = 'movie',
  SERIES = 'tv',
  SPARKS = 'sparks',
  SPORTS = 'sports'
}

export type UserPlan = Plan;
export type ContentItem = Content;

export interface ContentRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  contentTitle: string;
  status: 'pending' | 'approved' | 'processing' | 'fulfilled' | 'rejected';
  priority?: 'low' | 'normal' | 'high';
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
}

export interface Page {
  id: string; // url slug, e.g. 'about-us'
  title: string;
  category: 'Company' | 'Support' | 'Legal' | 'Connect';
  description: string;
  sections: {
    heading: string;
    content?: string;
    listItems?: string[];
    steps?: string[];
    buttonLabel?: string;
    buttonLink?: string;
  }[];
  lastUpdated?: string;
  isHidden?: boolean;
}