import { BaseScraper } from "./base";
import type { ScrapeResult } from "@/types";

export class YouTubeScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    // Normalise URL to channel page
    const url = profileUrl.replace(/\/$/, "");
    const username = url.split("/").pop() ?? "";

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();

    let followers: number | null = null;
    let postCount: number | null = null;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    // YouTube embeds data in ytInitialData JSON
    const ytDataMatch = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*(?:var |<\/script>)/);
    if (ytDataMatch) {
      try {
        const json = JSON.parse(ytDataMatch[1]);
        const header = json?.header?.pageHeaderRenderer
          ?? json?.header?.c4TabbedHeaderRenderer;

        // Subscriber count
        const subText =
          header?.subscriberCountText?.simpleText
          ?? header?.subscriberCountText?.runs?.[0]?.text
          ?? json?.sidebar?.channelSidebarRenderer?.items?.[0]
            ?.channelAboutFullMetadataRenderer?.subscriberCountText?.simpleText;

        if (subText) followers = this.parseNumber(subText.replace(/[^0-9KkMmBb.,]/g, ""));

        // Channel name
        displayName = header?.title?.simpleText
          ?? header?.title?.runs?.[0]?.text
          ?? null;

        // Avatar
        const avatarThumbnails = header?.avatar?.thumbnails ?? header?.channelHandleText;
        if (Array.isArray(header?.avatar?.thumbnails)) {
          avatarUrl = header.avatar.thumbnails.slice(-1)[0]?.url ?? null;
        }

        // Video count
        const videosText = json?.header?.pageHeaderRenderer?.videosCountText?.runs?.[0]?.text
          ?? null;
        if (videosText) postCount = parseInt(videosText.replace(/,/g, ""));
      } catch { /* continue to fallback */ }
    }

    // Fallback: regex patterns on raw HTML
    if (followers === null) {
      const patterns = [
        /"subscriberCountText":\{"simpleText":"([^"]+)"/,
        /"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/,
        /"metadataParts":\[.*?"text":\{"content":"([\d.,]+[KkMm]?\s*subscribers)"/i,
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m) {
          followers = this.parseNumber(m[1].replace(/[^0-9KkMmBb.,]/g, ""));
          if (followers) break;
        }
      }
    }

    if (!displayName) {
      displayName = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    }
    if (!avatarUrl) {
      avatarUrl = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ?? null;
    }

    if (followers === null) {
      return { success: false, error: "Could not extract YouTube subscriber count" };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following: null, totalLikes: null, postCount },
      posts: [],
    };
  }
}
