import { InstagramScraper } from "./instagram";
import { TikTokScraper } from "./tiktok";
import { FacebookScraper } from "./facebook";
import { YouTubeScraper } from "./youtube";
import type { Platform, ScrapeResult } from "@/types";
import { prisma } from "@/lib/prisma";
import { calculateEngagementRate } from "@/lib/utils";

export function getScraperForPlatform(platform: Platform) {
  switch (platform) {
    case "INSTAGRAM":
      return new InstagramScraper();
    case "TIKTOK":
      return new TikTokScraper();
    case "FACEBOOK":
      return new FacebookScraper();
    case "YOUTUBE":
      return new YouTubeScraper();
  }
}

export async function scrapeAndSave(accountId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) return { success: false, error: "Account not found" };
  if (account.isPaused) return { success: false, error: "Account is paused" };

  const scraper = getScraperForPlatform(account.platform as Platform);
  let result: ScrapeResult;

  try {
    result = await scraper.scrape(account.profileUrl);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await prisma.dailySnapshot.upsert({
      where: {
        accountId_date: {
          accountId,
          date: todayDate(),
        },
      },
      create: {
        accountId,
        date: todayDate(),
        status: "FAILED",
        errorMessage: error,
      },
      update: {
        status: "FAILED",
        errorMessage: error,
      },
    });
    return { success: false, error };
  }

  if (!result.success) {
    await prisma.dailySnapshot.upsert({
      where: { accountId_date: { accountId, date: todayDate() } },
      create: {
        accountId,
        date: todayDate(),
        status: "FAILED",
        errorMessage: result.error,
      },
      update: { status: "FAILED", errorMessage: result.error },
    });
    return { success: false, error: result.error };
  }

  const profile = result.profile!;
  const posts = result.posts ?? [];

  // Compute engagement rate if possible
  let engagementRate: number | null = null;
  if (profile.followers && posts.length > 0) {
    const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0);
    engagementRate = calculateEngagementRate(
      totalLikes,
      totalComments,
      profile.followers
    );
  }

  // Save/update snapshot
  await prisma.dailySnapshot.upsert({
    where: { accountId_date: { accountId, date: todayDate() } },
    create: {
      accountId,
      date: todayDate(),
      followers: profile.followers ?? undefined,
      following: profile.following ?? undefined,
      totalLikes: profile.totalLikes ?? undefined,
      postCount: profile.postCount ?? undefined,
      engagementRate,
      status: "SUCCESS",
      rawData: profile as Record<string, unknown>,
    },
    update: {
      followers: profile.followers ?? undefined,
      following: profile.following ?? undefined,
      totalLikes: profile.totalLikes ?? undefined,
      postCount: profile.postCount ?? undefined,
      engagementRate,
      status: "SUCCESS",
      rawData: profile as Record<string, unknown>,
    },
  });

  // Update account metadata
  await prisma.socialAccount.update({
    where: { id: accountId },
    data: {
      displayName: profile.displayName ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
      lastScraped: new Date(),
    },
  });

  // Save posts and their metrics
  for (const post of posts) {
    if (!post.externalId || !post.url) continue;

    const savedPost = await prisma.post.upsert({
      where: { accountId_externalId: { accountId, externalId: post.externalId } },
      create: {
        accountId,
        externalId: post.externalId,
        url: post.url,
        type: post.type,
        caption: post.caption ?? undefined,
        thumbnailUrl: post.thumbnailUrl ?? undefined,
        postedAt: post.postedAt ?? new Date(),
      },
      update: {
        caption: post.caption ?? undefined,
        thumbnailUrl: post.thumbnailUrl ?? undefined,
      },
    });

    // Save metric snapshot
    if (
      post.views !== null ||
      post.likes !== null ||
      post.comments !== null ||
      post.shares !== null
    ) {
      await prisma.postMetricsHistory.create({
        data: {
          postId: savedPost.id,
          views: post.views ?? undefined,
          likes: post.likes ?? undefined,
          comments: post.comments ?? undefined,
          shares: post.shares ?? undefined,
        },
      });
    }
  }

  return { success: true };
}

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
