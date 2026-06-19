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
<p id="msg" style="font-family:sans-serif;text-align:center;margin-top:80px;color:#666">Connecting your Instagram account...</p>
<script>
  function showError(msg) {
    var el = document.getElementById('msg');
    el.style.color = 'red';
    el.innerHTML = msg + ' <a href="/clients" style="color:#3b82f6">Go back</a>';
  }

  const hash = window.location.hash.substring(1);
  const params = Object.fromEntries(new URLSearchParams(hash));
  const token = params.long_lived_token || params.access_token;
  // Facebook returns state in the fragment, not the query string
  const state = params.state || '${state}';

  if (!token) {
    showError('Connection failed: no token received from Facebook. hash=' + hash.substring(0,80));
  } else {
    fetch('/api/instagram/save-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, state })
    })
    .then(async r => {
      const d = await r.json();
      if (d.redirect) {
        window.location.href = d.redirect;
      } else {
        showError('Connection failed: ' + (d.error || 'Unknown error'));
      }
    })
    .catch(e => showError('Connection failed: ' + e.message));
  }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
