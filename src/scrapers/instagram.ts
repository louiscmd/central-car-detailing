import { chromium } from "playwright";
import { BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult, ScrapedPost } from "@/types";

export class InstagramScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    try {
      const page = await context.newPage();

      // Block unnecessary resources to reduce fingerprint
      await page.route("**/*.{png,jpg,jpeg,gif,webp,mp4,woff,woff2}", (route) =>
        route.abort()
      );

      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Extract profile data from page meta / JSON-LD
      const profileData = await page.evaluate(() => {
        // Try shared_data or window._sharedData
        const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent ?? "");
            if (data["@type"] === "ProfilePage") return data;
          } catch {}
        }

        // Fallback: parse meta tags
        const getMeta = (name: string) =>
          document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ??
          document.querySelector(`meta[property="${name}"]`)?.getAttribute("content");

        return {
          description: getMeta("description") ?? getMeta("og:description"),
          title: getMeta("og:title"),
          fallback: true,
        };
      });

      // Parse follower count from description
      let followers: number | null = null;
      let following: number | null = null;
      let postCount: number | null = null;
      let displayName: string | null = null;
      let avatarUrl: string | null = null;

      if (profileData && !profileData.fallback) {
        // JSON-LD data
        const mainEntity = profileData.mainEntity ?? profileData;
        displayName = mainEntity.name ?? null;
        avatarUrl = mainEntity.image ?? null;

        // Instagram's JSON-LD sometimes has interactionStatistic
        const stats = mainEntity.interactionStatistic ?? [];
        for (const stat of stats) {
          if (stat.name === "Followers") followers = stat.userInteractionCount ?? null;
          if (stat.name === "Following") following = stat.userInteractionCount ?? null;
          if (stat.name === "Posts") postCount = stat.userInteractionCount ?? null;
        }
      }

      // Fallback: parse from description text e.g. "10.2K Followers, 500 Following, 120 Posts"
      if (followers === null) {
        const desc = profileData?.description ?? "";
        const followersMatch = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
        const followingMatch = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
        const postsMatch = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);

        if (followersMatch) followers = this.parseNumber(followersMatch[1]);
        if (followingMatch) following = this.parseNumber(followingMatch[1]);
        if (postsMatch) postCount = this.parseNumber(postsMatch[1]);
      }

      // Try to get username from URL
      const username =
        profileUrl.replace(/\/$/, "").split("/").pop() ?? "";

      // Get recent posts (visible grid, first 12)
      const posts: ScrapedPost[] = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll("article a[href*='/p/'], article a[href*='/reel/']")
        ).slice(0, 12);

        return anchors.map((a) => {
          const href = (a as HTMLAnchorElement).href;
          const img = a.querySelector("img");
          const isReel = href.includes("/reel/");
          return {
            externalId: href.split("/").filter(Boolean).pop() ?? href,
            url: href,
            type: isReel ? "REEL" : "POST",
            caption: img?.getAttribute("alt") ?? null,
            thumbnailUrl: img?.src ?? null,
            postedAt: null,
            views: null,
            likes: null,
            comments: null,
            shares: null,
          };
        });
      });

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
        posts,
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
