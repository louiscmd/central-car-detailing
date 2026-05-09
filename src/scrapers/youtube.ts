import { BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult } from "@/types";

export class YouTubeScraper extends BaseScraper {
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

    // YouTube embeds subscriber count in ytInitialData
    let followers: number | null = null;
    const subMatch = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/);
    if (subMatch) followers = this.parseNumber(subMatch[1].replace(/[^0-9KkMmBb.]/g, ""));

    // Fallback: meta description
    if (followers === null) {
      const desc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ?? "";
      const fMatch = desc.match(/([\d,.]+[KkMm]?)\s*subscribers/i);
      if (fMatch) followers = this.parseNumber(fMatch[1]);
    }

    const title = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    const avatar = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ?? null;

    // Video count
    const videoCountMatch = html.match(/"videosCountText":\{"runs":\[.*?"text":"([\d,]+)"/);
    const postCount = videoCountMatch ? parseInt(videoCountMatch[1].replace(/,/g, "")) : null;

    return {
      success: true,
      profile: { username, displayName: title, avatarUrl: avatar, followers, following: null, totalLikes: null, postCount },
      posts: [],
    };
  }
}
