import { BaseScraper } from "./base";
import type { ScrapeResult } from "@/types";

export class TikTokScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop()?.replace("@", "") ?? "";

    const res = await fetch(`https://www.tiktok.com/@${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
    });

    if (res.status === 429) return { success: false, error: "TikTok rate limit hit, try again later" };
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    let followers: number | null = null;
    let following: number | null = null;
    let totalLikes: number | null = null;
    let postCount: number | null = null;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    // TikTok embeds data in __UNIVERSAL_DATA_FOR_REHYDRATION__ script
    const universalMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (universalMatch) {
      try {
        const json = JSON.parse(universalMatch[1]);
        const userDetail =
          json?.["__DEFAULT_SCOPE__"]?.["webapp.user-detail"]?.userInfo?.user;
        const stats =
          json?.["__DEFAULT_SCOPE__"]?.["webapp.user-detail"]?.userInfo?.stats;

        if (stats) {
          followers = stats.followerCount ?? stats.fans ?? null;
          following = stats.followingCount ?? null;
          totalLikes = stats.heartCount ?? stats.diggCount ?? null;
          postCount = stats.videoCount ?? null;
        }
        if (userDetail) {
          displayName = userDetail.nickname ?? null;
          avatarUrl = userDetail.avatarLarger ?? userDetail.avatarMedium ?? null;
        }
      } catch { /* continue to fallback */ }
    }

    // Fallback: SIGI_STATE script
    if (followers === null) {
      const sigiMatch = html.match(/window\['SIGI_STATE'\]\s*=\s*(\{[\s\S]*?\});\s*window/);
      if (sigiMatch) {
        try {
          const json = JSON.parse(sigiMatch[1]);
          const userMap = json?.UserModule?.users ?? {};
          const statsMap = json?.UserModule?.stats ?? {};
          const user = userMap[username.toLowerCase()] ?? Object.values(userMap)[0] as Record<string, unknown> ?? {};
          const stats = statsMap[username.toLowerCase()] ?? Object.values(statsMap)[0] as Record<string, unknown> ?? {};
          followers = (stats as Record<string, unknown>)?.followerCount as number ?? null;
          following = (stats as Record<string, unknown>)?.followingCount as number ?? null;
          totalLikes = (stats as Record<string, unknown>)?.heartCount as number ?? null;
          postCount = (stats as Record<string, unknown>)?.videoCount as number ?? null;
          displayName = (user as Record<string, unknown>)?.nickname as string ?? null;
        } catch { /* continue */ }
      }
    }

    // Fallback: raw JSON key search
    if (followers === null) {
      const patterns = [
        /"followerCount"\s*:\s*(\d+)/,
        /"fans"\s*:\s*(\d+)/,
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m) { followers = parseInt(m[1]); break; }
      }
      const fMatch = html.match(/"followingCount"\s*:\s*(\d+)/);
      if (fMatch) following = parseInt(fMatch[1]);
      const lMatch = html.match(/"heartCount"\s*:\s*(\d+)/);
      if (lMatch) totalLikes = parseInt(lMatch[1]);
    }

    if (!avatarUrl) {
      avatarUrl = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    }
    if (!displayName) {
      const nameMatch = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ?? "";
      displayName = nameMatch.replace(/\s*\(@[^)]+\).*$/, "").trim() || null;
    }

    if (followers === null && following === null) {
      return { success: false, error: "TikTok blocked this request or returned no data" };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following, totalLikes, postCount },
      posts: [],
    };
  }
}
