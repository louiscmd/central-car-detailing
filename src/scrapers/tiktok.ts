import { chromium } from "playwright";
import { BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult, ScrapedPost } from "@/types";

export class TikTokScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    try {
      const page = await context.newPage();

      await page.route("**/*.{mp4,webm}", (route) => route.abort());

      await page.goto(profileUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2500);

      // TikTok renders server-side JSON in SIGI_STATE script
      const profileData = await page.evaluate(() => {
        try {
          const script = document.querySelector("#SIGI_STATE");
          if (script?.textContent) {
            const data = JSON.parse(script.textContent);
            const userDetail = Object.values(
              data?.UserPage?.userInfo ?? {}
            )[0] as Record<string, unknown> | undefined;
            if (userDetail) return userDetail;

            // try UserModule
            const userModule = data?.UserModule?.users ?? {};
            const firstUser = Object.values(userModule)[0] as
              | Record<string, unknown>
              | undefined;
            return firstUser ?? null;
          }
        } catch {}
        return null;
      });

      let followers: number | null = null;
      let following: number | null = null;
      let totalLikes: number | null = null;
      let displayName: string | null = null;
      let avatarUrl: string | null = null;
      let username = "";

      if (profileData) {
        const user = (profileData.user ?? profileData) as Record<string, unknown>;
        const stats = (profileData.stats ?? profileData) as Record<string, unknown>;
        displayName = (user.nickname as string) ?? null;
        avatarUrl = (user.avatarLarger as string) ?? null;
        username = (user.uniqueId as string) ?? "";
        followers = (stats.followerCount as number) ?? null;
        following = (stats.followingCount as number) ?? null;
        totalLikes = (stats.heartCount as number) ?? null;
      }

      // Fallback: parse from page meta
      if (followers === null) {
        const metaDesc = await page
          .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
          .catch(() => null);

        if (metaDesc) {
          const followersMatch = metaDesc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
          const followingMatch = metaDesc.match(/([\d,.]+[KkMm]?)\s*Following/i);
          const likesMatch = metaDesc.match(/([\d,.]+[KkMm]?)\s*Likes/i);
          if (followersMatch) followers = this.parseNumber(followersMatch[1]);
          if (followingMatch) following = this.parseNumber(followingMatch[1]);
          if (likesMatch) totalLikes = this.parseNumber(likesMatch[1]);
        }
      }

      if (!username) {
        username = profileUrl.replace(/\/$/, "").split("/").pop()?.replace("@", "") ?? "";
      }

      // Collect visible video cards
      const posts: ScrapedPost[] = await page.evaluate(() => {
        const cards = Array.from(
          document.querySelectorAll('[data-e2e="user-post-item"]')
        ).slice(0, 20);

        return cards.map((card) => {
          const link = card.querySelector("a") as HTMLAnchorElement | null;
          const img = card.querySelector("img");
          const viewsEl = card.querySelector(
            '[data-e2e="video-views"], .video-count'
          );

          const href = link?.href ?? "";
          const externalId = href.split("/video/")[1]?.split("?")[0] ?? href;

          return {
            externalId,
            url: href,
            type: "VIDEO",
            caption: img?.getAttribute("alt") ?? null,
            thumbnailUrl: img?.src ?? null,
            postedAt: null,
            views: viewsEl ? parseInt(viewsEl.textContent?.replace(/[^0-9]/g, "") ?? "0") : null,
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
          totalLikes,
          postCount: posts.length > 0 ? null : null,
        },
        posts,
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
