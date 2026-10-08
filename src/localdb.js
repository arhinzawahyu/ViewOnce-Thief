const fs = require("fs");
const path = require("path");
let Db = null; try { Db = require("node:sqlite").DatabaseSync; } catch {}
const DIR = path.join(__dirname, "..", "data");
const MEDIA = path.join(DIR, "viewonce");
const DBFILE = path.join(DIR, "local.db");
let db = null;
function init(){
  fs.mkdirSync(MEDIA, {recursive:true});
  if(!Db){ db=null; return; }
  db = new Db(DBFILE);
  db.exec(`CREATE TABLE IF NOT EXISTS media_items(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT, media_type TEXT, sender TEXT, name TEXT,
    caption TEXT, mime TEXT, path TEXT, created_at TEXT
  )`);
}
init();
function saveLocalMedia(buf, meta){
  if(!buf) return null;
  const ts = Date.now();
  const ext = meta.mime?.includes("video") ? "mp4" : meta.mime?.includes("audio") ? "ogg" : "jpg";
  const name = `${ts}_${Math.random().toString(36).slice(2,6)}.${ext}`;
  const file = path.join(MEDIA, name);
  fs.writeFileSync(file, buf);
  const row = { kind: meta.kind||"viewonce", media_type: meta.media_type||"image", sender: meta.sender||"", name: meta.name||"", caption: meta.caption||"", mime: meta.mime||"image/jpeg", path: name, created_at: meta.created_at||new Date().toISOString() };
  if(db){
    const q = db.prepare(`INSERT INTO media_items(kind,media_type,sender,name,caption,mime,path,created_at) VALUES(?,?,?,?,?,?,?,?)`);
    q.run(row.kind,row.media_type,row.sender,row.name,row.caption,row.mime,row.path,row.created_at);
    row.id = db.prepare(`SELECT last_insert_rowid() as id`).get().id;
  } else {
    // fallback json
    const jf = path.join(DIR,"local.json");
    let arr=[]; try{arr=JSON.parse(fs.readFileSync(jf,"utf8"))}catch{}
    row.id = arr.length+1; arr.push(row); fs.writeFileSync(jf, JSON.stringify(arr,null,2));
  }
  return row;
}
function listLocalMedia(limit=100){
  if(db) return db.prepare(`SELECT * FROM media_items ORDER BY id DESC LIMIT ?`).all(limit);
  try{ const a=JSON.parse(fs.readFileSync(path.join(DIR,"local.json"),"utf8")); return a.slice(-limit).reverse(); }catch{return []}
}
function getLocalMedia(id){
  if(db) return db.prepare(`SELECT * FROM media_items WHERE id=?`).get(Number(id));
  try{ const a=JSON.parse(fs.readFileSync(path.join(DIR,"local.json"),"utf8")); return a.find(x=>String(x.id)===String(id)); }catch{return null}
}
function deleteLocalMedia(id){
  const m = getLocalMedia(id);
  if(!m) return false;
  try{ fs.rmSync(path.join(MEDIA, path.basename(m.path)), { force: true }); }catch{}
  if(db){ db.prepare(`DELETE FROM media_items WHERE id=?`).run(Number(id)); }
  else {
    try{
      const jf = path.join(DIR,"local.json");
      const a = JSON.parse(fs.readFileSync(jf,"utf8")).filter(x=>String(x.id)!==String(id));
      fs.writeFileSync(jf, JSON.stringify(a,null,2));
    }catch{}
  }
  return true;
}
module.exports = { saveLocalMedia, listLocalMedia, getLocalMedia, deleteLocalMedia, MEDIA_DIR: MEDIA, DBFILE };
