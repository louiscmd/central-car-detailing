import { BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult } from "@/types";

export class InstagramScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop() ?? "";

    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": randomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    const desc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ?? "";
    const title = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ?? "";
    const avatar = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ?? null;

    const followersMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
    const followingMatch = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
    const postsMatch = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);

    const displayName = title.replace(/\(@[^)]+\).*$/, "").trim() || null;

    return {
      success: true,
      profile: {
        username,
        displayName,
        avatarUrl: avatar,
        followers: followersMatch ? this.parseNumber(followersMatch[1]) : null,
        following: followingMatch ? this.parseNumber(followingMatch[1]) : null,
        totalLikes: null,
        postCount: postsMatch ? this.parseNumber(postsMatch[1]) : null,
      },
      posts: [],
    };
  }
}
