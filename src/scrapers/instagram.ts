import { BaseScraper } from "./base";
import type { ScrapeResult } from "@/types";

export class InstagramScraper extends BaseScraper {
  // accessToken  = this account's own connected token (direct scrape via Graph API)
  // lookupToken  = any other connected account's token (Business Discovery API)
  constructor(
    private accessToken?: string,
    private lookupToken?: string
  ) {
    super();
  }

  async scrape(profileUrl: string): Promise<ScrapeResult> {
    return this.withRetry(() => this._scrape(profileUrl));
  }

  private async _scrape(profileUrl: string): Promise<ScrapeResult> {
    const username = profileUrl.replace(/\/$/, "").split("/").pop() ?? "";

    // 1. Apify Instagram Profile Scraper — works from Vercel, no auth needed
    if (process.env.APIFY_TOKEN) {
      const apifyResult = await this._scrapeViaApify(username);
      if (apifyResult.success) return apifyResult;
    }

    // 2. This account's own connected token → direct Graph API call
    if (this.accessToken) {
      return this._scrapeWithToken(username);
    }

    // 3. Another connected account's token → Business Discovery API
    if (this.lookupToken) {
      const result = await this._scrapeViaBusinessDiscovery(username, this.lookupToken);
      if (result.success) return result;
    }

    // 4. Direct Instagram mobile API (works from non-cloud IPs)
    const mobileResult = await this._scrapeViaMobileApi(username);
    if (mobileResult.success) return mobileResult;

    // 5. Instagram web API variant
    const gqlResult = await this._scrapeViaGql(username);
    if (gqlResult.success) return gqlResult;

    return {
      success: false,
      error: "Could not retrieve Instagram data.",
    };
  }

  // ─── Apify Instagram Profile Scraper ─────────────────────────────────────
  private async _scrapeViaApify(username: string): Promise<ScrapeResult> {
    try {
      const token = process.env.APIFY_TOKEN!;
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}&timeout=55`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
          signal: AbortSignal.timeout(58000),
        }
      );

      if (!res.ok) return { success: false, error: `Apify ${res.status}` };

      const items = await res.json() as Record<string, unknown>[];
      const u = items?.[0];
      if (!u) return { success: false, error: "Apify: no data returned" };

      const followers = (u.followersCount as number) ?? null;
      if (followers === null) return { success: false, error: "Apify: no follower count" };

      return {
        success: true,
        profile: {
          username: (u.username as string) ?? username,
          displayName: (u.fullName as string) ?? null,
          avatarUrl: (u.profilePicUrl as string) ?? null,
          followers,
          following: (u.followsCount as number) ?? null,
          totalLikes: null,
          postCount: (u.postsCount as number) ?? null,
        },
        posts: [],
      };
    } catch (e) {
      return { success: false, error: `Apify error: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // ─── Business Discovery API ───────────────────────────────────────────────
  // Lets you look up ANY public Instagram Business/Creator account using
  // a page access token from any connected Instagram Business account.
  private async _scrapeViaBusinessDiscovery(
    targetUsername: string,
    rawToken: string
  ): Promise<ScrapeResult> {
    try {
      // Token is stored as JSON: { userToken, pageToken, igAccountId }
      let pageToken = rawToken;
      let igAccountId: string | null = null;

      try {
        const parsed = JSON.parse(rawToken) as { pageToken?: string; igAccountId?: string };
        if (parsed.pageToken) pageToken = parsed.pageToken;
        if (parsed.igAccountId) igAccountId = parsed.igAccountId;
      } catch { /* plain token */ }

      if (!igAccountId) {
        // Method 1: Facebook Pages → instagram_business_account
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account,access_token&access_token=${pageToken}`,
          { signal: AbortSignal.timeout(10000) }
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
        // Method 2: Instagram directly linked to Facebook profile
        const meRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${pageToken}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (meRes.ok) {
          const meData = await meRes.json() as { instagram_business_account?: { id: string } };
          if (meData.instagram_business_account?.id) {
            igAccountId = meData.instagram_business_account.id;
          }
        }
      }

      if (!igAccountId) {
        return { success: false, error: "No Instagram Business/Creator account found. Switch your Instagram to a Business or Creator account and link it to a Facebook Page, then reconnect." };
      }

      // Business Discovery: look up target username using our IG account
      const fields = "business_discovery.fields(followers_count,follows_count,media_count,name,profile_picture_url,username,biography)";
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=${encodeURIComponent(fields)}&username=${encodeURIComponent(targetUsername)}&access_token=${pageToken}`,
        { signal: AbortSignal.timeout(12000) }
      );

      if (!res.ok) {
        const err = await res.json() as { error?: { message?: string } };
        return { success: false, error: `Business Discovery API error: ${err.error?.message ?? res.status}` };
      }

      const data = await res.json() as { business_discovery?: Record<string, unknown>; error?: { message: string } };

      if (data.error) {
        return { success: false, error: `Business Discovery: ${data.error.message}` };
      }

      const bd = data.business_discovery;
      if (!bd) {
        return { success: false, error: "Account not found or not an Instagram Business/Creator account" };
      }

      const followers = (bd.followers_count as number) ?? null;
      if (followers === null) return { success: false, error: "No follower count in Business Discovery response" };

      return {
        success: true,
        profile: {
          username: (bd.username as string) ?? targetUsername,
          displayName: (bd.name as string) ?? null,
          avatarUrl: (bd.profile_picture_url as string) ?? null,
          followers,
          following: (bd.follows_count as number) ?? null,
          totalLikes: null,
          postCount: (bd.media_count as number) ?? null,
        },
        posts: [],
      };
    } catch (e) {
      return { success: false, error: `Business Discovery exception: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // ─── Direct scraping fallbacks ────────────────────────────────────────────

  private async _scrapeViaMobileApi(username: string): Promise<ScrapeResult> {
    try {
      const res = await fetch(
        `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
        {
          headers: {
            "User-Agent": "Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)",
            "X-IG-App-ID": "936619743392459",
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(12000),
        }
      );
      if (!res.ok) return { success: false, error: `Mobile API ${res.status}` };
      const json = await res.json() as { data?: { user?: Record<string, unknown> } };
      const u = json?.data?.user;
      if (!u) return { success: false, error: "No user data" };
      const followers = (u.edge_followed_by as { count?: number })?.count ?? null;
      if (followers === null) return { success: false, error: "No follower count" };
      return {
        success: true,
        profile: {
          username: (u.username as string) ?? username,
          displayName: (u.full_name as string) ?? null,
          avatarUrl: (u.profile_pic_url_hd as string) ?? (u.profile_pic_url as string) ?? null,
          followers,
          following: (u.edge_follow as { count?: number })?.count ?? null,
          totalLikes: null,
          postCount: (u.edge_owner_to_timeline_media as { count?: number })?.count ?? null,
        },
        posts: [],
      };
    } catch {
      return { success: false, error: "Mobile API failed" };
    }
  }

  private async _scrapeViaGql(username: string): Promise<ScrapeResult> {
    try {
      const res = await fetch(
        `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "X-IG-App-ID": "936619743392459",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json",
            "Referer": "https://www.instagram.com/",
          },
          signal: AbortSignal.timeout(12000),
        }
      );
      if (!res.ok) return { success: false, error: `GQL ${res.status}` };
      const json = await res.json() as { data?: { user?: Record<string, unknown> } };
      const u = json?.data?.user;
      if (!u) return { success: false, error: "No user data" };
      const followers = (u.edge_followed_by as { count?: number })?.count ?? null;
      if (followers === null) return { success: false, error: "No follower count" };
      return {
        success: true,
        profile: {
          username: (u.username as string) ?? username,
          displayName: (u.full_name as string) ?? null,
          avatarUrl: (u.profile_pic_url_hd as string) ?? (u.profile_pic_url as string) ?? null,
          followers,
          following: (u.edge_follow as { count?: number })?.count ?? null,
          totalLikes: null,
          postCount: (u.edge_owner_to_timeline_media as { count?: number })?.count ?? null,
        },
        posts: [],
      };
    } catch {
      return { success: false, error: "GQL failed" };
    }
  }

  private async _scrapeViaEdge(username: string): Promise<ScrapeResult> {
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://social-analytics-dashboard-liard.vercel.app";
      const res = await fetch(`${baseUrl}/api/instagram/profile?username=${encodeURIComponent(username)}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { success: false, error: `Edge ${res.status}` };
      const data = await res.json() as { success?: boolean; followers?: number; following?: number; postCount?: number; displayName?: string; avatarUrl?: string; username?: string };
      if (!data.success || data.followers == null) return { success: false, error: "Edge proxy no data" };
      return {
        success: true,
        profile: {
          username: data.username ?? username,
          displayName: data.displayName ?? null,
          avatarUrl: data.avatarUrl ?? null,
          followers: data.followers,
          following: data.following ?? null,
          totalLikes: null,
          postCount: data.postCount ?? null,
        },
        posts: [],
      };
    } catch {
      return { success: false, error: "Edge proxy failed" };
    }
  }

  // ─── Own-account token scraping ──────────────────────────────────────────
  private async _scrapeWithToken(username: string): Promise<ScrapeResult> {
    let pageToken = this.accessToken!;
    let igAccountId: string | null = null;

    try {
      const parsed = JSON.parse(this.accessToken!) as { pageToken?: string; igAccountId?: string };
      if (parsed.pageToken) pageToken = parsed.pageToken;
      if (parsed.igAccountId) igAccountId = parsed.igAccountId;
    } catch { /* plain token */ }

    if (!igAccountId) {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async _fetchHtml(_url: string): Promise<string | null> { return null; }
}
