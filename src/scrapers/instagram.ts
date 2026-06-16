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

    // 1. Try Picuki (Instagram mirror — Vercel-accessible, caches IG profiles)
    const picuki = await this._fetchHtml(`https://www.picuki.com/profile/${username}`);
    if (picuki) {
      const result = this._parsePicuki(picuki, username);
      if (result.success) return result;
    }

    // 2. Try Imginn (another mirror)
    const imginn = await this._fetchHtml(`https://imginn.com/${username}/`);
    if (imginn) {
      const result = this._parseImginn(imginn, username);
      if (result.success) return result;
    }

    // 3. Try Instanavigation
    const instaNav = await this._fetchHtml(`https://instanavigation.com/instagram-profile/${username}`);
    if (instaNav) {
      const result = this._parseGenericMirror(instaNav, username);
      if (result.success) return result;
    }

    // 4. Try direct Instagram (may work occasionally)
    const direct = await this._fetchHtml(`https://www.instagram.com/${username}/`);
    if (direct) {
      const result = this._parseInstagramHtml(direct, username);
      if (result.success) return result;
    }

    // 5. Try allorigins proxy → Instagram
    const proxied = await this._fetchHtml(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.instagram.com/${username}/`)}`
    );
    if (proxied) {
      const result = this._parseInstagramHtml(proxied, username);
      if (result.success) return result;
    }

    return {
      success: false,
      error: "Could not retrieve Instagram data. The account may be private or Instagram is temporarily blocking requests.",
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
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  // Parse picuki.com/profile/{username}
  private _parsePicuki(html: string, username: string): ScrapeResult {
    // Picuki profile stats block: "1,234 Followers" / "567 Following" / "89 Posts"
    const followersM = html.match(/(\d[\d,.]*)\s*<\/span>\s*[^<]*[Ff]ollowers/);
    const followingM = html.match(/(\d[\d,.]*)\s*<\/span>\s*[^<]*[Ff]ollowing/);
    const postsM    = html.match(/(\d[\d,.]*)\s*<\/span>\s*[^<]*[Pp]osts/);
    const nameM     = html.match(/<h1[^>]*class="[^"]*profile-name[^"]*"[^>]*>([^<]+)<\/h1>/i)
                   ?? html.match(/<title>([^<|·]+)/i);

    const followers = followersM ? this.parseNumber(followersM[1]) : null;
    const following = followingM ? this.parseNumber(followingM[1]) : null;
    const postCount = postsM    ? this.parseNumber(postsM[1])    : null;
    const displayName = nameM   ? nameM[1].trim().replace(/Instagram$/i, "").trim() : null;

    // Avatar
    const avatarM = html.match(/<img[^>]+class="[^"]*profile[^"]*"[^>]+src="([^"]+)"/i)
                 ?? html.match(/property="og:image"\s+content="([^"]+)"/i);
    const avatarUrl = avatarM ? avatarM[1] : null;

    if (followers === null && postCount === null) {
      return { success: false, error: "No data found on Picuki" };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following, totalLikes: null, postCount },
      posts: [],
    };
  }

  // Parse imginn.com/{username}/
  private _parseImginn(html: string, username: string): ScrapeResult {
    // Imginn stats: <span class="number">1,234</span><span class="text">followers</span>
    const stats = [...html.matchAll(/<span[^>]*class="[^"]*number[^"]*"[^>]*>([\d,.KkMm]+)<\/span>\s*<span[^>]*class="[^"]*text[^"]*"[^>]*>([^<]+)<\/span>/gi)];

    let followers: number | null = null;
    let following: number | null = null;
    let postCount: number | null = null;

    for (const m of stats) {
      const val  = this.parseNumber(m[1]);
      const label = m[2].toLowerCase().trim();
      if (label.includes("follow") && !label.includes("ing")) followers = val;
      else if (label.includes("following")) following = val;
      else if (label.includes("post")) postCount = val;
    }

    // Fallback: simpler pattern
    if (followers === null) {
      const m = html.match(/([\d,.]+[KkMm]?)\s*followers/i);
      if (m) followers = this.parseNumber(m[1]);
    }

    const nameM   = html.match(/<title>([^<|·(]+)/i);
    const avatarM = html.match(/property="og:image"\s+content="([^"]+)"/i);
    const displayName = nameM ? nameM[1].trim() : null;
    const avatarUrl   = avatarM ? avatarM[1] : null;

    if (followers === null && postCount === null) {
      return { success: false, error: "No data found on Imginn" };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following, totalLikes: null, postCount },
      posts: [],
    };
  }

  // Generic mirror parser — looks for any "N followers" pattern in the HTML
  private _parseGenericMirror(html: string, username: string): ScrapeResult {
    const fM  = html.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowers/);
    const foM = html.match(/([\d,.]+[KkMm]?)\s*[Ff]ollowing/);
    const pM  = html.match(/([\d,.]+[KkMm]?)\s*[Pp]osts/);

    const followers = fM  ? this.parseNumber(fM[1])  : null;
    const following = foM ? this.parseNumber(foM[1]) : null;
    const postCount = pM  ? this.parseNumber(pM[1])  : null;

    const nameM   = html.match(/<title>([^<|·(]+)/i);
    const avatarM = html.match(/property="og:image"\s+content="([^"]+)"/i);

    if (followers === null && postCount === null) {
      return { success: false, error: "No data found" };
    }

    return {
      success: true,
      profile: {
        username,
        displayName: nameM ? nameM[1].trim() : null,
        avatarUrl: avatarM ? avatarM[1] : null,
        followers,
        following,
        totalLikes: null,
        postCount,
      },
      posts: [],
    };
  }

  // Parse Instagram's own HTML (works occasionally from non-blocked IPs)
  private _parseInstagramHtml(html: string, username: string): ScrapeResult {
    let followers: number | null = null;
    let following: number | null = null;
    let postCount: number | null = null;
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    // Embedded JSON
    const fBy   = html.match(/"edge_followed_by"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const fEdge = html.match(/"edge_follow"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const posts = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{"count"\s*:\s*(\d+)\}/);
    const name  = html.match(/"full_name"\s*:\s*"([^"]+)"/);
    const pic   = html.match(/"profile_pic_url_hd"\s*:\s*"([^"]+)"/);

    if (fBy)   followers  = parseInt(fBy[1]);
    if (fEdge) following  = parseInt(fEdge[1]);
    if (posts) postCount  = parseInt(posts[1]);
    if (name)  displayName = name[1];
    if (pic)   avatarUrl  = pic[1].replace(/\\u0026/g, "&");

    // og:description fallback
    if (followers === null) {
      const desc =
        html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1] ??
        html.match(/content="([^"]+)"\s+property="og:description"/i)?.[1] ?? "";
      const fM  = desc.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      const foM = desc.match(/([\d,.]+[KkMm]?)\s*Following/i);
      const pM  = desc.match(/([\d,.]+[KkMm]?)\s*Posts/i);
      if (fM)  followers  = this.parseNumber(fM[1]);
      if (foM) following  = this.parseNumber(foM[1]);
      if (pM)  postCount  = this.parseNumber(pM[1]);
    }

    if (!displayName) {
      const title = html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ?? "";
      displayName = title.replace(/\(@[^)]+\).*$/, "").trim() || null;
    }
    if (!avatarUrl) {
      avatarUrl = html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ?? null;
    }

    if (followers === null && postCount === null) {
      return { success: false, error: "No data found in Instagram response" };
    }

    return {
      success: true,
      profile: { username, displayName, avatarUrl, followers, following, totalLikes: null, postCount },
      posts: [],
    };
  }

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
}
