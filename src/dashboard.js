const http = require("http");
const fs = require("fs");
const path = require("path");
const { listLocalMedia, getLocalMedia, deleteLocalMedia, MEDIA_DIR } = require("./localdb");
const { updateConfig } = require("./config");

const PORT = Number(process.env.DASH_PORT || 3456);
let started = false;

const TOGGLES = [
  ["downloadMediaStatus", "Simpan media status otomatis"],
  ["autoReadStatus", "Tandai status sudah dibaca"],
  ["autoLikeStatus", "Sukai status otomatis"],
  ["antiDelete", "Simpan pesan yang dihapus"],
  ["antiTelpon", "Tolak panggilan otomatis"],
  ["autoKickStory", "Keluarkan penandai story grup"],
  ["sensorNomor", "Samarkan nomor"],
];

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
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config.json"), "utf8")); }
  catch { return null; }
}
function listInboxDB(limit) {
  try { return require("./localdb").listInbox(limit); } catch { return []; }
}

// ponytail: single-file dashboard CMS, ceiling ~500 items; upgrade pagination bila berat
const CSS = `:root{--bg:#0e0e12;--panel:#17171d;--panel2:#1e1e26;--ink:#f4f3ee;--mut:#a7a69e;--line:#2a2a33;--acc:#34d17b;--accink:#04170d;--r:16px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{font-family:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);margin:0}
a{color:inherit}
.wrap{max-width:520px;margin:0 auto;padding:0 12px 48px}
.topbar{position:sticky;top:0;z-index:5;background:var(--bg);padding:16px 0 10px;border-bottom:1px solid var(--line)}
.topbar h1{font-family:"Poppins","Inter",system-ui,sans-serif;font-size:22px;font-weight:800;margin:0;letter-spacing:-.02em}
.topbar h1 small{font-family:"Inter",sans-serif;font-weight:600;font-size:11px;color:var(--acc);margin-left:8px;letter-spacing:.08em}
.sub{font-size:12px;color:var(--mut);margin:4px 0 0}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.kpi .k{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:10px 8px;text-align:center}
.k .n{font-family:"Poppins",sans-serif;font-size:18px;font-weight:700;margin:0}
.k .l{font-size:10px;color:var(--mut);letter-spacing:.06em;text-transform:uppercase}
.toolbar{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center}
.chip{font-size:12px;font-weight:600;padding:8px 12px;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink);text-decoration:none}
.chip.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}
.chip:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.search{flex:1;min-width:140px;display:flex;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:0 14px;min-height:40px}
.search input{border:0;outline:0;width:100%;font-size:13px;background:transparent;color:var(--ink)}
.search input::placeholder{color:var(--mut)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}
.tile{position:relative;display:block;aspect-ratio:1/1;overflow:hidden;border-radius:12px;background:#000;animation:rise .35s ease both}
.tile img,.tile video{width:100%;height:100%;object-fit:cover;display:block}
.tile .tag{position:absolute;left:6px;bottom:6px;font-size:10px;font-weight:700;background:rgba(0,0,0,.7);color:#fff;padding:3px 8px;border-radius:999px}
.tile.au{display:flex;align-items:center;justify-content:center;background:var(--panel2);color:var(--ink);font-size:11px;font-weight:700;text-align:center;padding:8px;text-decoration:none;border:1px solid var(--line)}
.tile:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.empty{background:var(--panel);border:1px dashed var(--line);border-radius:var(--r);padding:26px 16px;text-align:center;margin-top:14px;color:var(--mut);font-size:13px}
.viewbox{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:12px}
.viewbox .media img,.viewbox .media video{width:100%;display:block;background:#000;max-height:70vh;object-fit:contain}
.viewbox audio{width:100%;display:block;margin:16px 0 4px}
.viewMeta{padding:14px}
.meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:11px;color:var(--mut);margin:0}
.badge{font-size:11px;font-weight:700;padding:4px 9px;border-radius:999px;border:1px solid var(--line);background:var(--panel2);color:var(--ink)}
.cap{font-size:14px;margin:8px 0 0;line-height:1.4}
.row2{display:flex;gap:8px;margin-top:12px}
.dlFull{flex:1;display:flex;min-height:48px;align-items:center;justify-content:center;background:var(--acc);color:var(--accink);font-weight:800;border-radius:12px;text-decoration:none;font-size:14px}
.btnGhost{flex:0 0 auto;min-width:84px;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid var(--line);background:var(--panel2);color:#e08a8a}
.back{display:inline-flex;min-height:44px;align-items:center;text-decoration:none;font-weight:600;font-size:13px}
.note{font-size:12px;color:var(--mut);margin-top:10px}
.cfg{margin-top:14px;background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:6px 14px 14px}
.cfg h3{font-family:"Poppins",sans-serif;font-size:14px;margin:12px 0 4px}
.cfg .hint{font-size:11px;color:var(--mut);margin:0 0 4px}
.trow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-top:1px solid var(--line);font-size:13px;font-weight:600}
.sw{min-width:56px;min-height:44px;border-radius:999px;border:1px solid var(--line);background:var(--panel2);color:var(--mut);font-size:12px;font-weight:800;cursor:pointer}
.sw.on{background:var(--acc);border-color:var(--acc);color:var(--accink)}
.sw:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.foot{margin-top:18px;text-align:center;font-size:11px;color:var(--mut)}
.ibox{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.irow{display:flex;flex-direction:column;align-items:flex-start;gap:3px}
.irow.group{align-items:flex-start}
.irow .who{font-size:10px;font-weight:700;color:var(--mut);letter-spacing:.04em}
.ibubble{max-width:88%;background:var(--panel2);border:1px solid var(--line);border-radius:16px 16px 16px 4px;padding:10px 13px;font-size:13px;line-height:1.4;word-break:break-word}
.irow.group .ibubble{border-radius:16px 16px 4px 16px;background:#24312a;border-color:#33513f}
.itime{font-size:10px;color:var(--mut);font-weight:600}
.mut{color:var(--mut)}
@keyframes rise{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.tile{animation:none}}
`;

function shell(title, body) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>${esc(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet"><style>${CSS}</style></head><body><div class="wrap">${body}</div></body></html>`;
}

function query(items, url) {
  const u = new URL(url, "http://x");
  const type = (u.searchParams.get("t") || "semua").toLowerCase();
  const s = (u.searchParams.get("q") || "").trim().toLowerCase();
  const q = items.filter((m) => {
    if (type === "image" && m.media_type !== "image") return false;
    if (type === "video" && m.media_type !== "video") return false;
    if (type === "audio" && m.media_type !== "audio") return false;
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

function tile(m, i) {
  const d = Math.min(i * 40, 240);
  if (m.media_type === "audio")
    return `<a class="tile au" style="animation-delay:${d}ms" href="/v/${m.id}" aria-label="Buka audio ${m.id}">Audio<br>#${m.id}</a>`;
  if (m.media_type === "video")
    return `<a class="tile" style="animation-delay:${d}ms" href="/v/${m.id}" aria-label="Buka video ${m.id}"><video src="/media/${m.id}" preload="metadata" playsinline muted></video><span class="tag">Video</span></a>`;
  return `<a class="tile" style="animation-delay:${d}ms" href="/v/${m.id}" aria-label="Buka foto ${m.id}"><img src="/media/${m.id}" loading="lazy" alt="Arsip foto ${m.id}"></a>`;
}

function page(items, reqUrl) {
  const { type, s, q } = query(items, reqUrl);
  const sc = stats(items);
  const chip = (id, lbl) => `<a class="chip${type === id ? " on" : ""}" href="/?t=${id}${s ? `&q=${encodeURIComponent(s)}` : ""}">${lbl}</a>`;
  const grid = q.map(tile).join("");
  const inboxRows = listInboxDB(40).map((r) => {
    const isG = r.group && r.group !== "-";
    const head = isG ? `${esc(r.sender)} · ${esc(r.group)}` : esc(r.sender);
    return `<div class="irow${isG ? " group" : ""}"><span class="who">${head}</span><div class="ibubble">${esc(r.text)}</div><span class="itime">${esc(fmtTime(r.created_at))} · ${esc(r.kind)}</span></div>`;
  }).join("");
  const inboxBox = `<section class="cfg"><h3>Pesan masuk</h3><p class="hint">Dulu di terminal, sekarang di sini. Nomor tampil penuh.</p><div class="ibox">${inboxRows || '<div class="mut">Belum ada pesan.</div>'}</div></section>`;
  const empty = q.length === 0
    ? `<div class="empty">${items.length === 0 ? "Belum ada arsip.<br>Balas pesan sekali-lihat dengan teks apa pun." : "Tidak ada hasil untuk filter ini."}</div>`
    : `<div class="grid">${grid}</div>`;

  const cfg = readConfig();
  const cfgBox = cfg ? `<section class="cfg" id="pengaturan"><h3>Pengaturan bot</h3><p class="hint">Ketuk untuk menyalakan atau mematikan langsung. Toggle sensor tetap ada, default OFF.</p>`
    + TOGGLES.map(([k, lbl]) => `<div class="trow"><span>${lbl}</span><form action="/api/toggle" method="post"><input type="hidden" name="key" value="${k}"><button class="sw${cfg[k] ? " on" : ""}" type="submit" aria-pressed="${!!cfg[k]}">${cfg[k] ? "ON" : "OFF"}</button></form></div>`).join("")
    + `</section>` : "";

  const body = `<header class="topbar"><h1>Arsip Sekali Lihat <small>ADMIN</small></h1><p class="sub">Galeri simpanan lokal, offline.</p>`
    + `<div class="kpi"><div class="k"><div class="n">${items.length}</div><div class="l">Total</div></div><div class="k"><div class="n">${sc.foto}</div><div class="l">Foto</div></div><div class="k"><div class="n">${sc.video}</div><div class="l">Video</div></div><div class="k"><div class="n">${sc.audio}</div><div class="l">Audio</div></div></div>`
    + `<form class="toolbar" action="/" method="get"><div class="search"><input name="q" value="${esc(s)}" placeholder="Cari pengirim atau keterangan" aria-label="Cari"><input type="hidden" name="t" value="${esc(type)}"></div></form>`
    + `<div class="toolbar">${chip("semua", "Semua")} ${chip("image", "Foto")} ${chip("video", "Video")} ${chip("audio", "Audio")}</div>`
    + `</header>`
    + empty + inboxBox + cfgBox
    + `<div class="foot">localhost:${PORT} · Arhinza · File aman di data/, tetap ada saat bot mati</div>`;
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
    + `<div class="meta"><span class="badge">${typel(m)}</span><span>#${m.id}</span><span>${esc(m.sender || "tanpa nama")}</span><span>${esc(fmtTime(m.created_at))}</span></div>`
    + (m.caption ? `<p class="cap">${esc(m.caption)}</p>` : `<p class="cap" style="color:var(--mut)">Tanpa keterangan</p>`)
    + `<div class="row2"><a class="dlFull" href="/media/${m.id}?download=1" download="${fname(m)}">Unduh kualitas penuh</a><a class="btnGhost" href="/hapus/${m.id}" onclick="return confirm('Hapus arsip #${m.id}?')">Hapus</a></div>`
    + `<div class="note">File asli dari perangkat ini, bukan pratinjau.</div>`
    + `</div></div>`;
  return shell(`Arsip #${m.id}`, body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 2048) req.destroy(); });
    req.on("end", () => resolve(b));
  });
}

function startDashboard(port = PORT) {
  if (started) return `http://localhost:${port}`;
  started = true;
  http.createServer(async (req, res) => {
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
      if (req.method === "POST" && u.pathname === "/api/toggle") {
        const b = await readBody(req);
        const key = decodeURIComponent((b.match(/key=([^&]*)/) || [, ""])[1] || "");
        const cfg = readConfig();
        if (cfg && TOGGLES.some(([k]) => k === key)) {
          updateConfig(key, !cfg[key]);
          res.writeHead(302, { Location: "/#pengaturan" });
          res.end("ok");
        } else { res.writeHead(400); res.end("bad key"); }
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
