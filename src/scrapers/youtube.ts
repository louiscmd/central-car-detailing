import { getBrowser, BaseScraper, randomUserAgent } from "./base";
import type { ScrapeResult, ScrapedPost } from "@/types";

export class YouTubeScraper extends BaseScraper {
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
      await page.route("**/*.{mp4,webm}", (route) => route.abort());

      // Navigate to channel's videos tab
      const videosUrl = profileUrl.endsWith("/videos")
        ? profileUrl
        : `${profileUrl.replace(/\/$/, "")}/videos`;

      await page.goto(videosUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2500);

      // YouTube embeds channel data in ytInitialData
      const channelData = await page.evaluate(() => {
        try {
          const scripts = Array.from(document.querySelectorAll("script"));
          for (const s of scripts) {
            const text = s.textContent ?? "";
            if (text.startsWith("var ytInitialData")) {
              const jsonStr = text
                .replace("var ytInitialData = ", "")
                .replace(/;$/, "");
              return JSON.parse(jsonStr);
            }
          }
        } catch {}
        return null;
      });

      let followers: number | null = null;
      let displayName: string | null = null;
      let avatarUrl: string | null = null;
      let username = "";

      if (channelData) {
        try {
          const header =
            channelData?.header?.pageHeaderRenderer ??
            channelData?.header?.c4TabbedHeaderRenderer;
          displayName = header?.title ?? null;

          const avatar = header?.avatar?.thumbnails ?? header?.channelHandleText;
          if (Array.isArray(header?.avatar?.thumbnails)) {
            avatarUrl = header.avatar.thumbnails.at(-1)?.url ?? null;
          }

          // Subscriber count
          const subCountText =
            header?.subscriberCountText?.simpleText ??
            header?.subscriberCountText?.runs?.[0]?.text;
          if (subCountText) {
            followers = this.parseNumber(
              subCountText.replace(/subscribers/i, "").trim()
            );
          }

          username =
            header?.channelHandleText?.runs?.[0]?.text?.replace("@", "") ??
            header?.navigationEndpoint?.commandMetadata?.webCommandMetadata
              ?.url
              ?.split("/")
              .pop()
              ?.replace("@", "") ??
            "";
        } catch {}
      }

      if (!username) {
        username = profileUrl
          .replace(/\/$/, "")
          .split("/")
          .filter((s) => s && s !== "videos")
          .pop()
          ?.replace("@", "") ?? "";
      }

      // Fallback from meta
      if (followers === null) {
        const metaDesc = await page
          .$eval('meta[name="description"]', (el) => el.getAttribute("content"))
          .catch(() => null);
        if (metaDesc) {
          const m = metaDesc.match(/([\d,.]+[KkMm]?)\s*subscribers/i);
          if (m) followers = this.parseNumber(m[1]);
        }
      }

      // Extract videos
      const posts: ScrapedPost[] = await page.evaluate(() => {
        const renderers = Array.from(
          document.querySelectorAll("ytd-rich-item-renderer, ytd-grid-video-renderer")
        ).slice(0, 20);

        return renderers.map((el) => {
          const titleEl = el.querySelector("#video-title");
          const link = el.querySelector("a#video-title, a.ytd-thumbnail") as HTMLAnchorElement | null;
          const img = el.querySelector("img") as HTMLImageElement | null;
          const viewsEl = el.querySelector(
            "#metadata-line span:first-child, .ytd-video-meta-block span"
          );
          const timeEl = el.querySelector(
            "#metadata-line span:last-child, .ytd-video-meta-block span:last-child"
          );

          const href = link?.href ?? "";
          const videoId = new URL(href || "https://youtube.com").searchParams.get("v") ?? href;

          const viewsText = viewsEl?.textContent ?? "";
          const viewNum = parseInt(viewsText.replace(/[^0-9]/g, "")) || null;

          return {
            externalId: videoId,
            url: href,
            type: "VIDEO",
            caption: (titleEl as HTMLElement)?.title ?? titleEl?.textContent?.trim() ?? null,
            thumbnailUrl: img?.src ?? null,
            postedAt: null,
            views: viewNum,
            likes: null,
            comments: null,
            shares: null,
          };
        });
      });

      const validPosts = posts.filter((p) => p.url && p.externalId);

      return {
        success: true,
        profile: {
          username,
          displayName,
          avatarUrl,
          followers,
          following: null,
          totalLikes: null,
          postCount: validPosts.length > 0 ? null : null,
        },
        posts: validPosts,
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
