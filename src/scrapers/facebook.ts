import { getBrowser, BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult, ScrapedPost } from "@/types";

export class FacebookScraper extends BaseScraper {
  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    try {
      const page = await context.newPage();
      await page.route("**/*.{mp4,webm,woff,woff2}", (route) => route.abort());

      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      // Try to dismiss cookie consent
      const cookieBtn = page.locator('[data-cookiebanner="accept_button"], button:has-text("Accept All")').first();
      if (await cookieBtn.isVisible().catch(() => false)) {
        await cookieBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
      }

      const username =
        profileUrl
          .replace(/\/$/, "")
          .split("/")
          .filter(Boolean)
          .pop() ?? "";

      // Extract from meta tags (most reliable for public pages)
      const metaData = await page.evaluate(() => {
        const getMeta = (name: string) =>
          document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ??
          document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ??
          null;

        return {
          title: getMeta("og:title"),
          description: getMeta("description") ?? getMeta("og:description"),
          image: getMeta("og:image"),
        };
      });

      let followers: number | null = null;
      let displayName: string | null = metaData.title;

      // Parse from page text
      const pageText = await page.evaluate(() => document.body.innerText);

      const followersMatch = pageText.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*(?:people follow this|followers)/i);
      const likesMatch = pageText.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*(?:people like this|likes)/i);

      if (followersMatch) followers = this.parseNumber(followersMatch[1]);
      const totalLikes = likesMatch ? this.parseNumber(likesMatch[1]) : null;

      // Collect post links visible on the page
      const posts: ScrapedPost[] = await page.evaluate(() => {
        const links = Array.from(
          document.querySelectorAll('a[href*="/posts/"], a[href*="/videos/"], a[href*="/reel/"]')
        )
          .filter((a) => {
            const href = (a as HTMLAnchorElement).href;
            return href && !href.includes("?") && href.length > 30;
          })
          .slice(0, 15);

        return links.map((a) => {
          const href = (a as HTMLAnchorElement).href;
          const isVideo = href.includes("/videos/") || href.includes("/reel/");
          const segments = href.split("/").filter(Boolean);
          const externalId = segments[segments.length - 1] ?? href;

          return {
            externalId,
            url: href,
            type: isVideo ? "VIDEO" : "POST",
            caption: null,
            thumbnailUrl: null,
            postedAt: null,
            views: null,
            likes: null,
            comments: null,
            shares: null,
          };
        });
      });

      const uniquePosts = posts.filter(
        (p, i, arr) => arr.findIndex((x) => x.externalId === p.externalId) === i
      );

      return {
        success: true,
        profile: {
          username,
          displayName,
          avatarUrl: metaData.image,
          followers,
          following: null,
          totalLikes,
          postCount: null,
        },
        posts: uniquePosts,
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
