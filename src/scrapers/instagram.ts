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

    if (this.accessToken) {
      return this._scrapeWithToken(username);
    }

    // Try direct fetch first
    const direct = await this._fetchHtml(
      `https://www.instagram.com/${username}/`
    );
    if (direct) {
      const result = this._parseHtml(direct, username);
      if (result.success) return result;
    }

    // Fallback: route through allorigins proxy (different IP)
    const proxied = await this._fetchHtml(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.instagram.com/${username}/`)}`
    );
    if (proxied) {
      const result = this._parseHtml(proxied, username);
      if (result.success) return result;
    }

    // Fallback: try corsproxy
    const proxied2 = await this._fetchHtml(
      `https://corsproxy.io/?url=${encodeURIComponent(`https://www.instagram.com/${username}/`)}`
    );
    if (proxied2) {
      const result = this._parseHtml(proxied2, username);
      if (result.success) return result;
    }

    return {
      success: false,
      error: "Instagram is blocking all requests. Try again later or connect via the yellow link button.",
    };
  }

  private async _fetchHtml(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  private _parseHtml(html: string, username: string): ScrapeResult {
    let followers: number | null = null;
    let following: number | null = null;
    let postCount: number | null = null;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    // Try embedded JSON data first
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

    // Fallback: og:description "10.2K Followers, 500 Following, 120 Posts"
    if (followers === null) {
      const desc =
        html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] ??
        html.match(/content="([^"]+)"\s+property="og:description"/i)?.[1] ?? "";
      const fM = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      const foM = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
      const pM = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);
      if (fM) followers = this.parseNumber(fM[1]);
      if (foM) following = this.parseNumber(foM[1]);
      if (pM) postCount = this.parseNumber(pM[1]);
    }

    if (!displayName) {
      const title =
        html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ?? "";
      displayName = title.replace(/\(@[^)]+\).*$/, "").trim() || null;
    }
    if (!avatarUrl) {
      avatarUrl =
        html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
    }

    if (followers === null && postCount === null) {
      return { success: false, error: "No data found in Instagram response" };
    }

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

  private async _scrapeWithToken(username: string): Promise<ScrapeResult> {
    // Token is stored as JSON: { userToken, pageToken, igAccountId }
    let pageToken = this.accessToken!;
    let igAccountId: string | null = null;

    try {
      const parsed = JSON.parse(this.accessToken!) as { pageToken?: string; igAccountId?: string };
      if (parsed.pageToken) pageToken = parsed.pageToken;
      if (parsed.igAccountId) igAccountId = parsed.igAccountId;
    } catch { /* plain token, use as-is */ }

    if (!igAccountId) {
      // Try to get the IG account ID from the page token
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account,access_token&access_token=${pageToken}`
      );
      if (pagesRes.ok) {
        const pages = await pagesRes.json() as { data: { access_token: string; instagram_business_account?: { id: string } }[] };
        const page = pages.data?.find(p => p.instagram_business_account);
        if (page) {
          igAccountId = page.instagram_business_account!.id;
          pageToken = page.access_token;
        }
      }
    }

    if (!igAccountId) {
      return { success: false, error: "Could not find Instagram Business account. Please reconnect." };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=username,name,biography,profile_picture_url,followers_count,follows_count,media_count&access_token=${pageToken}`
    );

    if (!res.ok) {
      return { success: false, error: `Instagram API error ${res.status}. Token may have expired — reconnect Instagram.` };
    }

    const data = (await res.json()) as Record<string, unknown>;

    return {
      success: true,
      profile: {
        username: (data.username as string) ?? username,
        displayName: (data.name as string) ?? null,
        avatarUrl: (data.profile_picture_url as string) ?? null,
        followers: (data.followers_count as number) ?? null,
        following: (data.follows_count as number) ?? null,
        totalLikes: null,
        postCount: (data.media_count as number) ?? null,
      },
      posts: [],
    };
  }
}
