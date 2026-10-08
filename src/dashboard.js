const http = require("http");
const fs = require("fs");
const path = require("path");
const { listLocalMedia, getLocalMedia, MEDIA_DIR } = require("./localdb");

const PORT = Number(process.env.DASH_PORT || 3456);
let started = false;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function mimeOf(f) {
  if (f.endsWith(".mp4")) return "video/mp4";
  if (f.endsWith(".ogg")) return "audio/ogg";
  return "image/jpeg";
}
// ponytail: single-file dashboard, ceiling ~500 items; upgrade ke pagination saat berat
function page(items) {
  const cards = items.map((m) => {
    const media = m.media_type === "video"
      ? `<video src="/media/${m.id}" controls preload="none" style="max-width:100%"></video>`
      : m.media_type === "audio"
        ? `<audio src="/media/${m.id}" controls style="width:100%"></audio>`
        : `<a href="/media/${m.id}" target="_blank"><img src="/media/${m.id}" loading="lazy" style="max-width:100%"></a>`;
    return `<div style="border:1px solid #ddd;border-radius:8px;padding:8px;background:#fff">
      ${media}
      <div style="font-size:12px;color:#555;margin-top:6px">#${m.id} · ${esc(m.sender)} · ${esc(m.created_at)}</div>
      <div style="font-size:13px">${esc(m.caption)}</div></div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ViewOnce Lokal</title></head>
<body style="font-family:sans-serif;background:#f4f4f4;margin:0;padding:16px">
<h2>ViewOnce — ${items.length} item (lokal, tanpa internet)</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">${cards || "<p>Belum ada. Balas pesan sekali-lihat dengan teks apa pun.</p>"}</div>
</body></html>`;
}

function startDashboard(port = PORT) {
  if (started) return `http://localhost:${port}`;
  started = true;
  http.createServer((req, res) => {
    try {
      const u = new URL(req.url, "http://x");
      if (u.pathname.startsWith("/media/")) {
        const m = getLocalMedia(u.pathname.slice(7));
        if (!m) { res.writeHead(404); res.end("no"); return; }
        const f = path.join(MEDIA_DIR, path.basename(m.path));
        if (!f.startsWith(MEDIA_DIR) || !fs.existsSync(f)) { res.writeHead(404); res.end("no"); return; }
        res.writeHead(200, { "Content-Type": m.mime || mimeOf(f) });
        fs.createReadStream(f).pipe(res);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
      res.end(page(listLocalMedia(200)));
    } catch { try { res.writeHead(500); res.end("err"); } catch {} }
  }).listen(port);
  return `http://localhost:${port}`;
}

module.exports = { startDashboard, DASH_URL: `http://localhost:${PORT}` };
