export const metadata = {
  title: "Privacy Policy – SocialPulse",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 40 }}>Last updated: June 2026</p>

      <h2>1. About SocialPulse</h2>
      <p>
        SocialPulse is an internal social media analytics dashboard used by Warsaw Media to track
        follower counts and engagement metrics for client social media accounts.
      </p>

      <h2>2. Data We Collect</h2>
      <p>
        When you connect an Instagram account via Facebook Login, we receive and store:
      </p>
      <ul>
        <li>Your Facebook user access token (to authenticate API requests)</li>
        <li>Your Facebook Page access token linked to the Instagram Business account</li>
        <li>The Instagram Business Account ID</li>
        <li>Public profile metrics: follower count, following count, media count, display name, and profile picture URL</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>
        Access tokens are stored securely and used solely to fetch Instagram account metrics
        (follower count, following count, post count) via the Instagram Graph API.
        We do not sell, share, or transfer your data to any third parties.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        Access tokens expire after 60 days. Metric snapshots are retained for historical
        trend analysis. You may request deletion of your data at any time by contacting us.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        You can disconnect your Instagram account at any time by contacting us. Upon request,
        we will delete all stored tokens and associated data for your account.
      </p>

      <h2>6. Contact</h2>
      <p>
        For privacy inquiries, contact us at:{" "}
        <a href="mailto:warsawmedia.pl@gmail.com">warsawmedia.pl@gmail.com</a>
      </p>
    </main>
  );
}
