import { prisma } from "@/lib/prisma";
import {
  getMonthRange,
  getDaysInMonth,
  calculateEngagementRate,
  bigIntToNumber,
} from "@/lib/utils";
import { format } from "date-fns";
import type {
  MonthlyAnalytics,
  TopPost,
  TimelinePoint,
  PlatformBreakdown,
  ReportData,
} from "@/types";

export async function getMonthlyAnalytics(
  accountId: string,
  month: number,
  year: number
): Promise<MonthlyAnalytics> {
  const { start, end } = getMonthRange(month, year);
  const days = getDaysInMonth(month, year);

  // Snapshots for the month
  const snapshots = await prisma.dailySnapshot.findMany({
    where: { accountId, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });

  const firstSnap = snapshots[0];
  const lastSnap = snapshots[snapshots.length - 1];

  const startFollowers = bigIntToNumber(firstSnap?.followers) ?? 0;
  const endFollowers = bigIntToNumber(lastSnap?.followers) ?? 0;
  const followerGrowth = endFollowers - startFollowers;
  const followerGrowthPercent =
    startFollowers > 0 ? (followerGrowth / startFollowers) * 100 : 0;

  // Followers timeline
  const followersTimeline: TimelinePoint[] = snapshots.map((s) => ({
    date: format(s.date, "MMM d"),
    value: bigIntToNumber(s.followers) ?? 0,
  }));

  // Posts and their monthly view growth
  const posts = await prisma.post.findMany({
    where: { accountId },
    include: {
      metrics: {
        where: { timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  let totalMonthlyViews = 0;
  let totalMonthlyLikes = 0;
  let totalMonthlyComments = 0;
  let postsWithData = 0;

  const topPosts: TopPost[] = [];

  for (const post of posts) {
    if (post.metrics.length === 0) continue;

    const firstMetric = post.metrics[0];
    const lastMetric = post.metrics[post.metrics.length - 1];

    const viewGrowth =
      (bigIntToNumber(lastMetric.views) ?? 0) -
      (bigIntToNumber(firstMetric.views) ?? 0);
    const likeGrowth =
      (bigIntToNumber(lastMetric.likes) ?? 0) -
      (bigIntToNumber(firstMetric.likes) ?? 0);
    const commentGrowth =
      (bigIntToNumber(lastMetric.comments) ?? 0) -
      (bigIntToNumber(firstMetric.comments) ?? 0);

    totalMonthlyViews += Math.max(0, viewGrowth);
    totalMonthlyLikes += Math.max(0, likeGrowth);
    totalMonthlyComments += Math.max(0, commentGrowth);
    postsWithData++;

    topPosts.push({
      id: post.id,
      url: post.url,
      thumbnailUrl: post.thumbnailUrl,
      caption: post.caption,
      type: post.type as TopPost["type"],
      postedAt: post.postedAt,
      views: bigIntToNumber(lastMetric.views) ?? 0,
      likes: bigIntToNumber(lastMetric.likes) ?? 0,
      comments: bigIntToNumber(lastMetric.comments) ?? 0,
      viewGrowthThisMonth: Math.max(0, viewGrowth),
    });
  }

  topPosts.sort((a, b) => b.viewGrowthThisMonth - a.viewGrowthThisMonth);

  const avgViewsPerPost =
    postsWithData > 0 ? Math.round(totalMonthlyViews / postsWithData) : 0;

  const avgEngagement =
    lastSnap && bigIntToNumber(lastSnap.followers)
      ? calculateEngagementRate(
          totalMonthlyLikes,
          totalMonthlyComments,
          bigIntToNumber(lastSnap.followers)!
        )
      : 0;

  // Views timeline (daily view accumulation)
  const viewsTimeline: TimelinePoint[] = days.map((day) => {
    const dayStr = format(day, "MMM d");
    // Sum all posts' metrics for that day
    let dayViews = 0;
    for (const post of posts) {
      const dayMetric = post.metrics.find(
        (m) => format(m.timestamp, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
      );
      if (dayMetric) dayViews += bigIntToNumber(dayMetric.views) ?? 0;
    }
    return { date: dayStr, value: dayViews };
  });

  const engagementTimeline: TimelinePoint[] = snapshots.map((s) => ({
    date: format(s.date, "MMM d"),
    value: s.engagementRate ?? 0,
  }));

  return {
    month,
    year,
    totalFollowers: endFollowers,
    followerGrowth,
    followerGrowthPercent,
    totalViews: totalMonthlyViews,
    totalLikes: totalMonthlyLikes,
    totalComments: totalMonthlyComments,
    engagementRate: avgEngagement,
    postCount: lastSnap?.postCount ?? postsWithData,
    avgViewsPerPost,
    topPosts: topPosts.slice(0, 10),
    followersTimeline,
    viewsTimeline,
    engagementTimeline,
  };
}

export async function getClientMonthlyReport(
  clientId: string,
  month: number,
  year: number
): Promise<ReportData> {
  const { start, end } = getMonthRange(month, year);

  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    include: { accounts: true },
  });

  const platforms: PlatformBreakdown[] = [];
  let totalFollowers = 0;
  let totalFollowerGrowth = 0;
  let totalViews = 0;
  let totalEngagement = 0;
  let totalPosts = 0;
  const allTopPosts: TopPost[] = [];
  const followerChart: TimelinePoint[] = [];
  const viewsChart: TimelinePoint[] = [];

  for (const account of client.accounts) {
    if (account.isPaused) continue;

    const analytics = await getMonthlyAnalytics(account.id, month, year);

    platforms.push({
      platform: account.platform as PlatformBreakdown["platform"],
      followers: analytics.totalFollowers,
      followerGrowth: analytics.followerGrowth,
      totalViews: analytics.totalViews,
      engagementRate: analytics.engagementRate,
      postCount: analytics.postCount,
    });

    totalFollowers += analytics.totalFollowers;
    totalFollowerGrowth += analytics.followerGrowth;
    totalViews += analytics.totalViews;
    totalEngagement += analytics.engagementRate;
    totalPosts += analytics.postCount;
    allTopPosts.push(...analytics.topPosts);

    // Merge timelines
    analytics.followersTimeline.forEach((point) => {
      const existing = followerChart.find((p) => p.date === point.date);
      if (existing) {
        existing.value += point.value;
      } else {
        followerChart.push({ ...point });
      }
    });

    analytics.viewsTimeline.forEach((point) => {
      const existing = viewsChart.find((p) => p.date === point.date);
      if (existing) {
        existing.value += point.value;
      } else {
        viewsChart.push({ ...point });
      }
    });
  }

  allTopPosts.sort((a, b) => b.viewGrowthThisMonth - a.viewGrowthThisMonth);

  const avgEngagement =
    platforms.length > 0 ? totalEngagement / platforms.length : 0;

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return {
    client: { id: client.id, name: client.name },
    period: { month, year, label: monthLabel },
    summary: {
      totalFollowers,
      followerGrowth: totalFollowerGrowth,
      totalViews,
      totalEngagement: avgEngagement,
      postsPublished: totalPosts,
    },
    platforms,
    topContent: allTopPosts.slice(0, 10),
    followerChart: followerChart.sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    viewsChart: viewsChart.sort((a, b) => a.date.localeCompare(b.date)),
    generatedAt: new Date().toISOString(),
  };
}

export async function getDashboardStats(userId: string) {
  const { start, end } = getMonthRange(
    new Date().getMonth() + 1,
    new Date().getFullYear()
  );

  const [clients, accounts, snapshots] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.socialAccount.count({
      where: { client: { userId } },
    }),
    prisma.dailySnapshot.findMany({
      where: {
        account: { client: { userId } },
        date: { gte: start, lte: end },
      },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
    }),
  ]);

  const totalFollowers = snapshots.reduce(
    (sum, s) => sum + (bigIntToNumber(s.followers) ?? 0),
    0
  );

  const activeClients = await prisma.client.count({
    where: { userId, isPaused: false },
  });

  const recentSnapshots = await prisma.dailySnapshot.count({
    where: {
      account: { client: { userId } },
      date: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
    totalClients: clients,
    totalAccounts: accounts,
    totalFollowers,
    totalViewsThisMonth: 0, // computed lazily per client
    activeClients,
    recentSnapshots,
  };
}

/** Returns Mon-Sun of the current calendar week. */
function currentWeekDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun … 6=Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

async function weekViewsForPosts(
  posts: { metrics: { timestamp: Date; views: bigint | null }[] }[]
): Promise<TimelinePoint[]> {
  const days = currentWeekDays();
  const monday = days[0];
  const sunday = days[6];
  const end = new Date(sunday);
  end.setHours(23, 59, 59, 999);

  return days.map((day) => {
    const dayStr = format(day, "MMM d");
    let dayViews = 0;
    for (const post of posts) {
      const dayMetric = post.metrics.find(
        (m) =>
          m.timestamp >= monday &&
          m.timestamp <= end &&
          format(m.timestamp, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
      );
      if (dayMetric) dayViews += bigIntToNumber(dayMetric.views) ?? 0;
    }
    return { date: dayStr, value: dayViews };
  });
}

export async function get7DayViewsGlobal(userId: string): Promise<TimelinePoint[]> {
  const days = currentWeekDays();
  const since = days[0];

  const posts = await prisma.post.findMany({
    where: { account: { client: { userId } } },
    include: {
      metrics: {
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  return weekViewsForPosts(posts);
}

export async function get7DayViewsForClient(clientId: string): Promise<TimelinePoint[]> {
  const days = currentWeekDays();
  const since = days[0];

  const posts = await prisma.post.findMany({
    where: { account: { clientId } },
    include: {
      metrics: {
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  return weekViewsForPosts(posts);
}

export interface PlatformViewsPoint {
  date: string;
  TIKTOK: number;
  INSTAGRAM: number;
  FACEBOOK: number;
  YOUTUBE: number;
  total: number;
}

export async function get7DayViewsByPlatform(userId: string): Promise<{
  timeline: PlatformViewsPoint[];
  totals: { TIKTOK: number; INSTAGRAM: number; FACEBOOK: number; YOUTUBE: number; total: number };
}> {
  const days = currentWeekDays();
  const endOfWeek = new Date(days[6]);
  endOfWeek.setHours(23, 59, 59, 999);

  // Load ALL metrics (not just this week) so posts scraped before Monday still appear
  const posts = await prisma.post.findMany({
    where: { account: { client: { userId } } },
    include: {
      account: { select: { platform: true } },
      metrics: {
        where: { timestamp: { lte: endOfWeek } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  const timeline: PlatformViewsPoint[] = days.map((day) => {
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    const point: PlatformViewsPoint = {
      date: format(day, "MMM d"),
      TIKTOK: 0, INSTAGRAM: 0, FACEBOOK: 0, YOUTUBE: 0, total: 0,
    };

    for (const post of posts) {
      // Most recent metric on or before end of this day
      let latest: { views: bigint | null } | undefined;
      for (let i = post.metrics.length - 1; i >= 0; i--) {
        if (post.metrics[i].timestamp <= endOfDay) { latest = post.metrics[i]; break; }
      }
      if (!latest) continue;

      const views = bigIntToNumber(latest.views) ?? 0;
      const plat = post.account.platform as keyof Omit<PlatformViewsPoint, "date" | "total">;
      point[plat] += views;
      point.total += views;
    }

    return point;
  });

  const last = timeline[timeline.length - 1];
  const totals = last
    ? { TIKTOK: last.TIKTOK, INSTAGRAM: last.INSTAGRAM, FACEBOOK: last.FACEBOOK, YOUTUBE: last.YOUTUBE, total: last.total }
    : { TIKTOK: 0, INSTAGRAM: 0, FACEBOOK: 0, YOUTUBE: 0, total: 0 };

  return { timeline, totals };
}

export async function get7DayViewsForAccount(accountId: string): Promise<TimelinePoint[]> {
  const days = currentWeekDays();
  const since = days[0];

  const posts = await prisma.post.findMany({
    where: { accountId },
    include: {
      metrics: {
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  return weekViewsForPosts(posts);
}

export async function getFollowerGrowthTrend(
  accountId: string,
  days: number = 30
): Promise<TimelinePoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.dailySnapshot.findMany({
    where: { accountId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  return snapshots.map((s) => ({
    date: format(s.date, "MMM d"),
    value: bigIntToNumber(s.followers) ?? 0,
  }));
}
