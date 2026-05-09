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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.tiktok.com/",
      },
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    // Try multiple patterns for follower count
    let followers: number | null = null;
    let following: number | null = null;
    let totalLikes: number | null = null;
    let displayName: string | null = null;

    const patterns = [
      /"followerCount"\s*:\s*(\d+)/,
      /"fans"\s*:\s*(\d+)/,
      /"followers"\s*:\s*(\d+)/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) { followers = parseInt(m[1]); break; }
    }

    const followingMatch = html.match(/"followingCount"\s*:\s*(\d+)/) ?? html.match(/"following"\s*:\s*(\d+)/);
    if (followingMatch) following = parseInt(followingMatch[1]);

    const likesMatch = html.match(/"heartCount"\s*:\s*(\d+)/) ?? html.match(/"diggCount"\s*:\s*(\d+)/);
    if (likesMatch) totalLikes = parseInt(likesMatch[1]);

    const nameMatch = html.match(/"nickname"\s*:\s*"([^"]+)"/) ?? html.match(/"authorName"\s*:\s*"([^"]+)"/);
    if (nameMatch) displayName = nameMatch[1];

    // Fallback: og meta description
    if (followers === null) {
      const desc = html.match(/content="([^"]*Followers[^"]*)"/i)?.[1] ?? "";
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
