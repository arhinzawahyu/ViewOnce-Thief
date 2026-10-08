const http = require("http");
const fs = require("fs");
const path = require("path");
const { listLocalMedia, getLocalMedia, deleteLocalMedia, MEDIA_DIR } = require("./localdb");

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
function fname(m) {
  const ext = m.mime?.includes("video") ? "mp4" : m.mime?.includes("audio") ? "ogg" : "jpg";
  return `sekali-lihat-${m.id}.${ext}`;
}
function typel(m) {
  return m.media_type === "video" ? "Video" : m.media_type === "audio" ? "Audio" : "Foto";
}
function fmtTime(s) {
  if (!s) return "-";
  try { return s.slice(0, 16).replace("T", " "); } catch { return esc(s); }
}
function readConfig() {
  try {
    const p = path.join(__dirname, "..", "config.json");
    const c = JSON.parse(fs.readFileSync(p, "utf8"));
    return c;
  } catch { return null; }
}

// ponytail: single-file dashboard CMS, ceiling ~500 items; upgrade pagination bila berat
const CSS = `:root{--bg:#f4f4f2;--panel:#fff;--ink:#121210;--mut:#77766f;--line:#e8e8e4;--acc:#18794e;--acc2:#0f5b3a;--soft:#eef6f0;--r:16px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{font-family:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);margin:0}
a{color:inherit}
.wrap{max-width:520px;margin:0 auto;padding:0 12px 40px}
.topbar{position:sticky;top:0;z-index:5;background:var(--bg);padding:14px 0 8px;border-bottom:1px solid var(--line)}
.topbar h1{font-family:"Poppins","Inter",system-ui,sans-serif;font-size:22px;font-weight:700;margin:0;letter-spacing:-.02em}
.topbar h1 small{font-family:"Inter",sans-serif;font-weight:600;font-size:12px;color:var(--mut);margin-left:8px}
.sub{font-size:12px;color:var(--mut);margin:4px 0 0}
.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.kpi .k{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px}
.k .n{font-family:"Poppins",sans-serif;font-size:20px;font-weight:700;margin:0}
.k .l{font-size:11px;color:var(--mut);letter-spacing:.04em;text-transform:uppercase}
.toolbar{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center}
.chip{font-size:12px;font-weight:600;padding:8px 11px;border-radius:999px;border:1px solid var(--line);background:var(--panel);text-decoration:none}
.chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.chip:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.search{flex:1;min-width:140px;display:flex;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:0 12px;min-height:38px}
.search input{border:0;outline:0;width:100%;font-size:13px;background:transparent}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:12px;animation:rise .42s ease both}
.thumb{display:block;width:100%;background:#0f0f0f}
.thumb img,.thumb video{width:100%;display:block}
.meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--mut);margin:0}
.badge{font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:#fafaf9}
.badge.v{border-color:#cfe9d8;color:#0f5b3a;background:var(--soft)}
.badge.a{border-color:#e8d9b0;color:#6b5a1f;background:#fff8df}
.cap{font-size:14px;margin:6px 0 0;line-height:1.35}
.actions{display:flex;gap:8px;margin-top:10px}
.btn{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid var(--line);background:#fafaf9}
.btn.main{background:var(--acc);border-color:var(--acc);color:#fff}
.btn.ghost{background:#fff}
.btn.danger{color:#8a1a1a;border-color:#e8bcbc;background:#fff5f5}
.btn:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.pad{padding:12px}
.empty{background:var(--panel);border:1px dashed var(--line);border-radius:var(--r);padding:26px 16px;text-align:center;margin-top:14px;color:var(--mut);font-size:13px}
.viewbox{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:12px}
.viewbox .media img,.viewbox .media video{width:100%;display:block;background:#0f0f0f}
.viewMeta{padding:14px}
.viewMeta .row2{display:flex;gap:8px;margin-top:12px}
.dlFull{display:flex;min-height:48px;align-items:center;justify-content:center;background:var(--acc);color:#fff;font-weight:800;border-radius:12px;text-decoration:none;font-size:14px}
.back{display:inline-flex;min-height:44px;align-items:center;text-decoration:none;font-weight:600;font-size:13px}
.cfg{margin-top:14px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px}
.cfg h3{font-family:"Poppins",sans-serif;font-size:14px;margin:0 0 10px}
.kv{display:grid;grid-template-columns:1fr auto;gap:8px;font-size:13px}
.kv b{font-weight:700}
.switch{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:28px;border-radius:999px;border:1px solid var(--line);font-size:11px;font-weight:700}
.switch.on{background:var(--soft);color:var(--acc2);border-color:#cfe9d8}
.foot{margin-top:18px;text-align:center;font-size:11px;color:var(--mut)}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.card{animation:none}}
`;

function shell(title, body) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;
}

function query(q, url) {
  const u = new URL(url, "http://x");
  const type = (u.searchParams.get("t") || "semua").toLowerCase();
  const s = (u.searchParams.get("q") || "").trim().toLowerCase();
  q = q.filter((m) => {
    if (type !== "semua" && m.media_type !== type) return false;
    if (!s) return true;
    return `${m.sender} ${m.caption} ${m.id}`.toLowerCase().includes(s);
  });
  return { type, s, q };
}

function stats(items) {
  const c = { foto: 0, video: 0, audio: 0 };
  for (const m of items) {
    if (m.media_type === "video") c.video++;
    else if (m.media_type === "audio") c.audio++;
    else c.foto++;
  }
  return c;
}

function page(items, reqUrl) {
  const { type, s, q } = query(items, reqUrl);
  const sc = stats(items);
  const chip = (id, label) => `<a class="chip${type === id ? " on" : ""}" href="/?t=${id}${s ? `&q=${encodeURIComponent(s)}` : ""}">${label}</a>`;
  const cards = q.map((m, i) => {
    const isVid = m.media_type === "video";
    const isAud = m.media_type === "audio";
    const media = isVid
      ? `<a class="thumb" href="/v/${m.id}"><video src="/media/${m.id}" preload="metadata" playsinline muted></video></a>`
      : isAud
        ? `<div class="pad" style="padding-bottom:0"><audio src="/media/${m.id}" controls preload="none" style="width:100%"></audio></div>`
        : `<a class="thumb" href="/v/${m.id}"><img src="/media/${m.id}" loading="lazy" alt="Arsip ${typel(m)} ${m.id}"></a>`;
    const badge = `<span class="badge ${isVid ? "v" : isAud ? "a" : ""}">${typel(m)}</span>`;
    return `<article class="card" style="animation-delay:${Math.min(i * 55, 280)}ms">${media}`
      + `<div class="pad"><div class="meta">${badge}<span>#${m.id}</span><span>${esc(m.sender || "tanpa nama")}</span><span>${esc(fmtTime(m.created_at))}</span></div>`
      + (m.caption ? `<div class="cap">${esc(m.caption)}</div>` : `<div class="cap" style="color:var(--mut)">Tanpa keterangan</div>`)
      + `<div class="actions"><a class="btn ghost" href="/v/${m.id}">Buka</a><a class="btn main" href="/media/${m.id}?download=1" download="${fname(m)}">Unduh</a><a class="btn danger" href="/hapus/${m.id}" onclick="return confirm('Hapus arsip #${m.id}?')">Hapus</a></div></div></article>`;
  }).join("");

  const empty = q.length === 0
    ? `<div class="empty">${items.length === 0 ? "Belum ada arsip.<br>Balas pesan sekali-lihat dengan teks apa pun." : "Tidak ada hasil untuk filter ini."}</div>`
    : "";

  const cfg = readConfig();
  const cfgBox = cfg ? `<section class="cfg"><h3>Status bot</h3><div class="kv">`
    + `<span>Download media status</span><b class="switch ${cfg.downloadMediaStatus ? "on" : ""}">${cfg.downloadMediaStatus ? "ON" : "OFF"}</b>`
    + `<span>Anti telepon</span><b class="switch ${cfg.antiTelpon ? "on" : ""}">${cfg.antiTelpon ? "ON" : "OFF"}</b>`
    + `<span>Auto baca status</span><b class="switch ${cfg.autoReadStatus ? "on" : ""}">${cfg.autoReadStatus ? "ON" : "OFF"}</b>`
    + `<span>Auto like status</span><b class="switch ${cfg.autoLikeStatus ? "on" : ""}">${cfg.autoLikeStatus ? "ON" : "OFF"}</b>`
    + `<span>Sensor nomor</span><b class="switch ${cfg.sensorNomor ? "on" : ""}">${cfg.sensorNomor ? "ON" : "OFF"}</b>`
    + `</div><div class="foot" style="margin-top:10px">Ubah lewat chat: #on / #off, #info</div></section>` : "";

  const body = `<header class="topbar"><h1>Arsip Sekali Lihat <small>Admin</small></h1><p class="sub">Lokal, offline. Disimpan di perangkat ini.</p>`
    + `<div class="kpi"><div class="k"><div class="n">${items.length}</div><div class="l">Total</div></div><div class="k"><div class="n">${sc.foto}</div><div class="l">Foto</div></div><div class="k"><div class="n">${sc.video}</div><div class="l">Video</div></div></div>`
    + `<form class="toolbar" action="/" method="get"><div class="search"><input name="q" value="${esc(s)}" placeholder="Cari pengirim atau keterangan" aria-label="Cari"><input type="hidden" name="t" value="${esc(type)}"></div></form>`
    + `<div class="toolbar">${chip("semua", "Semua")} ${chip("image", "Foto")} ${chip("video", "Video")} ${chip("audio", "Audio")}</div>`
    + `</header>`
    + (cards || empty)
    + cfgBox
    + `<div class="foot">localhost:${PORT} · &copy; Arhinza</div>`;

  return shell("Arsip · Admin", body);
}

function viewPage(m) {
  const isVid = m.media_type === "video";
  const isAud = m.media_type === "audio";
  const media = isVid
    ? `<video src="/media/${m.id}" controls preload="metadata" playsinline></video>`
    : isAud
      ? `<audio src="/media/${m.id}" controls preload="none"></audio>`
      : `<img src="/media/${m.id}" alt="Arsip ${typel(m)} ${m.id}">`;
  const body = `<a class="back" href="/">← Kembali</a>`
    + `<div class="viewbox"><div class="media">${media}</div><div class="viewMeta">`
    + `<div class="meta"><span class="badge ${isVid ? "v" : isAud ? "a" : ""}">${typel(m)}</span><span>#${m.id}</span><span>${esc(m.sender || "tanpa nama")}</span><span>${esc(fmtTime(m.created_at))}</span></div>`
    + (m.caption ? `<p style="font-size:15px;margin:8px 0 0">${esc(m.caption)}</p>` : `<p style="color:var(--mut);font-size:13px">Tanpa keterangan</p>`)
    + `<div class="row2"><a class="dlFull" style="flex:1" href="/media/${m.id}?download=1" download="${fname(m)}">Unduh kualitas penuh</a><a class="btn ghost" style="flex:0 0 auto;min-width:84px" href="/hapus/${m.id}" onclick="return confirm('Hapus arsip #${m.id}?')">Hapus</a></div>`
    + `<div class="foot" style="text-align:left;margin-top:10px">File asli dari perangkat ini, bukan pratinjau.</div>`
    + `</div></div>`;
  return shell(`Arsip #${m.id}`, body);
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
        const h = { "Content-Type": m.mime || mimeOf(f) };
        if (u.searchParams.get("download") === "1") h["Content-Disposition"] = `attachment; filename="${fname(m)}"`;
        res.writeHead(200, h);
        fs.createReadStream(f).pipe(res);
        return;
      }
      if (u.pathname.startsWith("/hapus/")) {
        const ok = deleteLocalMedia(u.pathname.slice(7));
        res.writeHead(302, { Location: "/" });
        res.end(ok ? "hapus ok" : "no");
        return;
      }
      if (u.pathname.startsWith("/v/")) {
        const m = getLocalMedia(u.pathname.slice(3));
        res.writeHead(m ? 200 : 404, { "Content-Type": "text/html;charset=utf-8" });
        res.end(m ? viewPage(m) : shell("Tidak ada", `<a class="back" href="/">← Kembali</a><div class="empty">Arsip tidak ada.</div>`));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
      res.end(page(listLocalMedia(200), req.url));
    } catch { try { res.writeHead(500); res.end("err"); } catch {} }
  }).listen(port);
  return `http://localhost:${port}`;
}

module.exports = { startDashboard, DASH_URL: `http://localhost:${PORT}` };
