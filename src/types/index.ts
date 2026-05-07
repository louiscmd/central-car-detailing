export type Platform = "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "YOUTUBE";
export type PostType = "POST" | "REEL" | "VIDEO" | "STORY" | "SHORT";
export type SnapshotStatus = "SUCCESS" | "FAILED" | "PARTIAL";
export type Role = "ADMIN" | "USER";

export interface ClientWithAccounts {
  id: string;
  name: string;
  notes: string | null;
  tags: string[];
  isPaused: boolean;
  userId: string;
  accounts: SocialAccountSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialAccountSummary {
  id: string;
  platform: Platform;
  username: string;
  profileUrl: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPaused: boolean;
  lastScraped: Date | null;
}

export interface DailySnapshotData {
  id: string;
  accountId: string;
  date: Date;
  followers: bigint | null;
  following: bigint | null;
  totalLikes: bigint | null;
  postCount: number | null;
  engagementRate: number | null;
  status: SnapshotStatus;
}

export interface PostData {
  id: string;
  accountId: string;
  externalId: string;
  url: string;
  type: PostType;
  caption: string | null;
  thumbnailUrl: string | null;
  postedAt: Date;
}

export interface PostMetrics {
  views: bigint | null;
  likes: bigint | null;
  comments: bigint | null;
  shares: bigint | null;
  timestamp: Date;
}

// Analytics computed types
export interface MonthlyAnalytics {
  month: number;
  year: number;
  totalFollowers: number;
  followerGrowth: number;
  followerGrowthPercent: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  engagementRate: number;
  postCount: number;
  avgViewsPerPost: number;
  topPosts: TopPost[];
  followersTimeline: TimelinePoint[];
  viewsTimeline: TimelinePoint[];
  engagementTimeline: TimelinePoint[];
}

export interface TopPost {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  type: PostType;
  postedAt: Date;
  views: number;
  likes: number;
  comments: number;
  viewGrowthThisMonth: number;
}

export interface TimelinePoint {
  date: string;
  value: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  followers: number;
  followerGrowth: number;
  totalViews: number;
  engagementRate: number;
  postCount: number;
}

export interface ReportData {
  client: {
    id: string;
    name: string;
  };
  period: {
    month: number;
    year: number;
    label: string;
  };
  summary: {
    totalFollowers: number;
    followerGrowth: number;
    totalViews: number;
    totalEngagement: number;
    postsPublished: number;
  };
  platforms: PlatformBreakdown[];
  topContent: TopPost[];
  followerChart: TimelinePoint[];
  viewsChart: TimelinePoint[];
  generatedAt: string;
}

// Scraper types
export interface ScrapeResult {
  success: boolean;
  error?: string;
  profile?: ScrapedProfile;
  posts?: ScrapedPost[];
}

export interface ScrapedProfile {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  followers: number | null;
  following: number | null;
  totalLikes: number | null;
  postCount: number | null;
  bio?: string | null;
}

export interface ScrapedPost {
  externalId: string;
  url: string;
  type: PostType;
  caption?: string | null;
  thumbnailUrl?: string | null;
  postedAt: Date | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalClients: number;
  totalAccounts: number;
  totalFollowers: number;
  totalViewsThisMonth: number;
  activeClients: number;
  recentSnapshots: number;
}
