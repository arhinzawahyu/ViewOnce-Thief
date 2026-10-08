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
  db.exec(`CREATE TABLE IF NOT EXISTS inbox(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT, "group" TEXT, name TEXT, text TEXT, kind TEXT, created_at TEXT
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS deleted(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT, "group" TEXT, name TEXT, text TEXT, kind TEXT, created_at TEXT, deleted_at TEXT
  )`);
  try { db.exec(`ALTER TABLE inbox ADD COLUMN name TEXT`); } catch {}
  try { db.exec(`ALTER TABLE deleted ADD COLUMN name TEXT`); } catch {}
}
init();
function saveInbox(sender, text, kind, group, name){
  if(!text) return null;
  const row = { sender: sender||"?", "group": group||"-", name: name||"", text: String(text).slice(0,500), kind: kind||"text", created_at: new Date().toISOString() };
  if(db){
    db.prepare(`INSERT INTO inbox(sender,"group",name,text,kind,created_at) VALUES(?,?,?,?,?,?)`).run(row.sender,row["group"],row.name,row.text,row.kind,row.created_at);
    row.id = db.prepare(`SELECT last_insert_rowid() as id`).get().id;
  } else {
    try{
      const jf = path.join(DIR,"inbox.json");
      const a = JSON.parse(fs.readFileSync(jf,"utf8")); a.push(row);
      row.id = a.length; fs.writeFileSync(jf, JSON.stringify(a,null,2));
    }catch{ fs.writeFileSync(path.join(DIR,"inbox.json"), JSON.stringify([row],null,2)); row.id = 1; }
  }
  return row;
}
function listInbox(limit=80){
  if(db) return db.prepare(`SELECT * FROM inbox ORDER BY id DESC LIMIT ?`).all(limit);
  try{ return JSON.parse(fs.readFileSync(path.join(DIR,"inbox.json"),"utf8")).slice(-limit).reverse(); }catch{ return [] }
}
function saveDeleted(sender, text, kind, group, name){
  if(!text) return null;
  const row = { sender: sender||"?", "group": group||"-", name: name||"", text: String(text).slice(0,600), kind: kind||"text", created_at: new Date().toISOString(), deleted_at: new Date().toISOString() };
  if(db){
    db.prepare(`INSERT INTO deleted(sender,"group",name,text,kind,created_at,deleted_at) VALUES(?,?,?,?,?,?,?)`).run(row.sender,row["group"],row.name,row.text,row.kind,row.created_at,row.deleted_at);
    row.id = db.prepare(`SELECT last_insert_rowid() as id`).get().id;
  } else {
    try{
      const jf = path.join(DIR,"deleted.json");
      const a = JSON.parse(fs.readFileSync(jf,"utf8")); a.push(row);
      row.id = a.length; fs.writeFileSync(jf, JSON.stringify(a,null,2));
    }catch{ fs.writeFileSync(path.join(DIR,"deleted.json"), JSON.stringify([row],null,2)); row.id = 1; }
  }
  return row;
}
function listDeleted(limit=80){
  if(db) return db.prepare(`SELECT * FROM deleted ORDER BY id DESC LIMIT ?`).all(limit);
  try{ return JSON.parse(fs.readFileSync(path.join(DIR,"deleted.json"),"utf8")).slice(-limit).reverse(); }catch{ return [] }
}
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
module.exports = { saveLocalMedia, listLocalMedia, getLocalMedia, deleteLocalMedia, saveInbox, listInbox, saveDeleted, listDeleted, MEDIA_DIR: MEDIA, DBFILE };
