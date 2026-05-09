import { BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult } from "@/types";

export class FacebookScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent": randomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    const username = profileUrl.replace(/\/$/, "").split("/").pop() ?? "";
    const title = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    const desc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ?? "";
    const avatar = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ?? null;

    const followersMatch = desc.match(/([\d,.]+[KkMm]?)\s*(followers|likes)/i);
    const followers = followersMatch ? this.parseNumber(followersMatch[1]) : null;

    return {
      success: true,
      profile: { username, displayName: title, avatarUrl: avatar, followers, following: null, totalLikes: null, postCount: null },
      posts: [],
    };
  }
}
