import { BaseScraper } from "./base";
import type { ScrapeResult } from "@/types";

export class InstagramScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop() ?? "";

    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    if (res.status === 429) {
      return { success: false, error: "Instagram is rate-limiting this server's IP. Try again in a few minutes." };
    }
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    // Parse from embedded JSON in script tags
    let followers: number | null = null;
    let following: number | null = null;
    let postCount: number | null = null;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    const edgeFollowedBy = html.match(/"edge_followed_by"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const edgeFollow = html.match(/"edge_follow"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const edgePosts = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const fullName = html.match(/"full_name"\s*:\s*"([^"]+)"/);
    const picUrl = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);

    if (edgeFollowedBy) followers = parseInt(edgeFollowedBy[1]);
    if (edgeFollow) following = parseInt(edgeFollow[1]);
    if (edgePosts) postCount = parseInt(edgePosts[1]);
    if (fullName) displayName = fullName[1];
    if (picUrl) avatarUrl = picUrl[1].replace(/\\u0026/g, "&");

    // Fallback: og meta description "10.2K Followers, 500 Following, 120 Posts"
    if (followers === null) {
      const desc = html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1]
        ?? html.match(/content="([^"]+)"\s+property="og:description"/i)?.[1]
        ?? "";
      const fMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      const foMatch = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
      const pMatch = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);
      if (fMatch) followers = this.parseNumber(fMatch[1]);
      if (foMatch) following = this.parseNumber(foMatch[1]);
      if (pMatch) postCount = this.parseNumber(pMatch[1]);
    }

    if (!displayName) {
      const title = html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1]
        ?? html.match(/content="([^"]+)"\s+property="og:title"/i)?.[1]
        ?? "";
      displayName = title.replace(/\(@[^)]+\).*$/, "").trim() || null;
    }

    if (!avatarUrl) {
      avatarUrl = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
    }

    if (followers === null && following === null && postCount === null) {
      return { success: false, error: "Instagram blocked this request. The account may be private or Instagram is restricting server access." };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following, totalLikes: null, postCount },
      posts: [],
    };
  }
}
