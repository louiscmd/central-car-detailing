// This route runs on the Vercel Edge Runtime (Cloudflare network),
// which has different IPs than the Node.js serverless runtime (AWS).
// Instagram blocks AWS IPs but allows Cloudflare edge IPs.
export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return Response.json({ error: "username required" }, { status: 400 });
  }

  // Try Instagram's internal web API (requires X-IG-App-ID)
  const endpoints: { url: string; headers: Record<string, string> }[] = [
    {
      url: `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      headers: {
        "X-IG-App-ID": "936619743392459",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.instagram.com/",
        "X-Requested-With": "XMLHttpRequest",
      },
    },
    {
      url: `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      headers: {
        "X-IG-App-ID": "936619743392459",
        "User-Agent": "Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)",
        "Accept": "application/json",
      },
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint.url, {
        headers: endpoint.headers,
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) continue;

      const json = await res.json() as { data?: { user?: Record<string, unknown> } };
      const u = json?.data?.user;
      if (!u) continue;

      const followers = (u.edge_followed_by as { count?: number })?.count ?? null;
      if (followers === null) continue;

      return Response.json({
        success: true,
        username: (u.username as string) ?? username,
        displayName: (u.full_name as string) ?? null,
        avatarUrl: (u.profile_pic_url_hd as string) ?? (u.profile_pic_url as string) ?? null,
        followers,
        following: (u.edge_follow as { count?: number })?.count ?? null,
        postCount: (u.edge_owner_to_timeline_media as { count?: number })?.count ?? null,
      });
    } catch {
      continue;
    }
  }

  return Response.json({ success: false, error: "Could not fetch Instagram profile" }, { status: 422 });
}
