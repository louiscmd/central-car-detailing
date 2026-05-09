import { BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult } from "@/types";

export class TikTokScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop()?.replace("@", "") ?? "";

    const res = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        "User-Agent": randomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    const sigiMatch = html.match(/"followerCount":(\d+)/);
    const followingMatch = html.match(/"followingCount":(\d+)/);
    const likesMatch = html.match(/"heartCount":(\d+)/);
    const nameMatch = html.match(/"nickname":"([^"]+)"/);

    let followers = sigiMatch ? parseInt(sigiMatch[1]) : null;
    const following = followingMatch ? parseInt(followingMatch[1]) : null;
    const totalLikes = likesMatch ? parseInt(likesMatch[1]) : null;
    const displayName = nameMatch ? nameMatch[1] : null;

    if (followers === null) {
      const desc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ?? "";
      const fMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      if (fMatch) followers = this.parseNumber(fMatch[1]);
    }

    const avatar = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ?? null;

    return {
      success: true,
      profile: { username, displayName, avatarUrl: avatar, followers, following, totalLikes, postCount: null },
      posts: [],
    };
  }
}
