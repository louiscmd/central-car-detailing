import { NextResponse } from "next/server";

// Facebook Business Login returns the token as a URL fragment (#access_token=...)
// Fragments are not sent to the server, so we return an HTML page that reads
// the fragment client-side and POSTs it to /api/instagram/save-token.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get("state") ?? "";

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting Instagram...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;margin-top:80px">Connecting your Instagram account...</p>
<script>
  const hash = window.location.hash.substring(1);
  const params = Object.fromEntries(new URLSearchParams(hash));
  const token = params.long_lived_token || params.access_token;
  if (!token) {
    document.body.innerHTML = '<p style="font-family:sans-serif;text-align:center;margin-top:80px;color:red">Connection failed. <a href="/clients">Go back</a></p>';
  } else {
    fetch('/api/instagram/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, state: '${state}' })
    })
    .then(r => r.json())
    .then(d => { window.location.href = d.redirect || '/clients'; })
    .catch(() => { window.location.href = '/clients?error=save_failed'; });
  }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
