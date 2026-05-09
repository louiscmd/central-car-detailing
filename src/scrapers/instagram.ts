import { BaseScraper } from "./base";
import type { ScrapeResult } from "@/types";

export class InstagramScraper extends BaseScraper {
  private accessToken?: string;

  constructor(accessToken?: string) {
    super();
    this.accessToken = accessToken;
  }

  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop() ?? "";

    // Use official API if we have a token
    if (this.accessToken) {
      return this._scrapeWithToken(username);
    }

    // Fallback: HTML scraping
    return this._scrapeHtml(username);
  }

  private async _scrapeWithToken(username: string): Promise<ScrapeResult> {
    const res = await fetch(
      `https://graph.instagram.com/me?fields=id,username,media_count,account_type&access_token=${this.accessToken}`
    );

    if (!res.ok) {
      return { success: false, error: `Instagram API error ${res.status}` };
    }

    const data = await res.json() as Record<string, unknown>;

    // Get follower count (requires business/creator account)
    let followers: number | null = null;
    const insightsRes = await fetch(
      `https://graph.instagram.com/${data.id}?fields=followers_count,follows_count,name,profile_picture_url&access_token=${this.accessToken}`
    );
    if (insightsRes.ok) {
      const insights = await insightsRes.json() as Record<string, unknown>;
      followers = insights.followers_count as number ?? null;
    }

    return {
      success: true,
      profile: {
        username: data.username as string ?? username,
        displayName: data.name as string ?? null,
        avatarUrl: data.profile_picture_url as string ?? null,
        followers,
        following: null,
        totalLikes: null,
        postCount: data.media_count as number ?? null,
      },
      posts: [],
    };
  }

  private async _scrapeHtml(username: string): Promise<ScrapeResult> {
    const res = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    });

    if (res.status === 429) return { success: false, error: "Instagram is rate-limiting. Connect via OAuth for reliable data." };
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    let followers: number | null = null;
    let following: number | null = null;
    let postCount: number | null = null;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    const fBy = html.match(/"edge_followed_by"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const fEdge = html.match(/"edge_follow"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const posts = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const name = html.match(/"full_name"\s*:\s*"([^"]+)"/);
    const pic = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);

    if (fBy) followers = parseInt(fBy[1]);
    if (fEdge) following = parseInt(fEdge[1]);
    if (posts) postCount = parseInt(posts[1]);
    if (name) displayName = name[1];
    if (pic) avatarUrl = pic[1].replace(/\\u0026/g, "&");

    if (followers === null) {
      const desc = html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] ?? "";
      const fM = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      const foM = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
      const pM = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);
      if (fM) followers = this.parseNumber(fM[1]);
      if (foM) following = this.parseNumber(foM[1]);
      if (pM) postCount = this.parseNumber(pM[1]);
    }

    if (followers === null && postCount === null) {
      return { success: false, error: "Instagram blocked this request. Use 'Connect Instagram' button for reliable data." };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following, totalLikes: null, postCount },
      posts: [],
    };
  }
}
