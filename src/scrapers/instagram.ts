import { BaseScraper } from "./base";
import type { ScrapeResult } from "@/types";

export class InstagramScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop() ?? "";

    // Use Instagram's internal profile API — same endpoint their web app uses
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.instagram.com/",
          "Origin": "https://www.instagram.com",
          "x-ig-app-id": "936619743392459",
          "x-requested-with": "XMLHttpRequest",
        },
      }
    );

    if (!res.ok) return { success: false, error: `Instagram API returned ${res.status}` };

    let json: Record<string, unknown>;
    try {
      json = await res.json() as Record<string, unknown>;
    } catch {
      return { success: false, error: "Failed to parse Instagram response" };
    }

    const user = (json?.data as Record<string, unknown>)?.user as Record<string, unknown> | undefined;
    if (!user) return { success: false, error: "No user data in Instagram response" };

    const followers = (user.edge_followed_by as Record<string, unknown>)?.count as number ?? null;
    const following = (user.edge_follow as Record<string, unknown>)?.count as number ?? null;
    const postCount = (user.edge_owner_to_timeline_media as Record<string, unknown>)?.count as number ?? null;
    const displayName = user.full_name as string ?? null;
    const avatarUrl = user.profile_pic_url_hd as string ?? user.profile_pic_url as string ?? null;

    return {
      success: true,
      profile: {
        username,
        displayName,
        avatarUrl,
        followers,
        following,
        totalLikes: null,
        postCount,
      },
      posts: [],
    };
  }
}
