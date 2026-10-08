const { config, updateConfig, sensorNum } = require("./config");
const { logCuy } = require("./logger");
const { backupSessions } = require("./session");
const { handleViewOnce } = require("./viewonce");

async function handleCommand(sock, msg, myJid, reply) {
  const validateNumber = async (commandname, type, sc, data) => {
    if (!data) { await reply(`Nomor harus diisi.\ncontoh : \`${commandname} blacklist 628123456789\``); return false; }
    if (!/^\d+$/.test(data)) { await reply(`Nomor harus angka.\ncontoh : \`${commandname} blacklist 628123456789\``); return false; }
    return true;
  };
  const FEATURES = { autoread: "Auto Read Status", autolike: "Auto Like Status", dlmedia: "Download Media Status", sensornomor: "Sensor Nomor", antitelpon: "Anti Telepon", kickstory: "Auto Kick Story", antidelete: "Anti Delete" };
  switch (msg.cmd) {
    case "on":
    case "off": {
      const enabling = msg.cmd === "on";
      const verbOn = enabling ? "mengaktifkan" : "menonaktifkan";
      const helpList = Object.entries(FEATURES).map(([k, v]) => `\`#${msg.cmd} ${k}\` untuk ${verbOn} ${v.toLowerCase()}`).join("\n");
      if (msg.args[0].trim() === "") await reply(`mana argumennya ?\ncontoh : \`#${msg.cmd} autolike\`\n\n${helpList}`);
      else for (const arg of msg.args) { const key = arg.trim().toLowerCase(); if (!FEATURES[key]) { await reply(`Argumen tidak valid: ${arg}`); continue; } config[key] = enabling; updateConfig(key, enabling); await reply(`${FEATURES[key]} ${enabling ? "aktif" : "nonaktif"}`); }
      break;
    }
    case "add":
    case "remove": {
      const removing = msg.cmd === "remove";
      const verb = removing ? "menghapus" : "menambahkan";
      if (msg.args[0].trim() === "") await reply(`mana argumennya ?\ncontoh : \`#${msg.cmd} blacklist 628123456789\``);
      else for (const arg of msg.args) {
        const [list, data] = arg.trim().split(" ");
        if (list === "emojis") {
          const emojiRegex = /^[\p{Emoji}\u200D\uFE0F]$/gu;
          if (!data) { await reply("emoji harus diisi."); continue; }
          if (!emojiRegex.test(data)) { await reply("hanya 1 emoji."); continue; }
          if (removing && config.emojis.length === 1) { await reply("Tidak bisa hapus emoji terakhir."); continue; }
          const idx = config.emojis.indexOf(data);
          if (!removing && idx !== -1) { await reply(`emoji ${data} sudah ada`); continue; }
          if (removing && idx === -1) { await reply(`emoji ${data} tidak ada`); continue; }
          if (removing) config.emojis.splice(idx, 1); else config.emojis.push(data);
          updateConfig("emojis", config.emojis); await reply(`emoji ${data} ${removing ? "dihapus" : "ditambahkan"}`);
        } else if (list === "blacklist" || list === "whitelist") {
          if (!await validateNumber(`#${msg.cmd}`, verb, removing ? "dari" : "ke", data)) continue;
          const arr = list === "blacklist" ? config.blackList : config.whiteList;
          const idx = arr.indexOf(data);
          if (!removing && idx !== -1) { await reply(`Nomor ${sensorNum(data)} sudah ada di ${list}`); continue; }
          if (removing && idx === -1) { await reply(`Nomor ${sensorNum(data)} tidak ada di ${list}`); continue; }
          if (removing) arr.splice(idx, 1); else arr.push(data);
          updateConfig(list, arr); await reply(`Nomor ${sensorNum(data)} ${removing ? "dihapus dari" : "ditambahkan ke"} ${list}`);
        } else await reply(`Argumen tidak valid: ${arg}`);
      }
      break;
    }
    case "menu": {
      const onList = [], offList = [];
      for (const [name, key] of [["sensor", "sensorNomor"], ["autoread", "autoReadStatus"], ["autolike", "autoLikeStatus"], ["dlmedia", "downloadMediaStatus"], ["anticall", "antiTelpon"], ["kickstory", "autoKickStory"], ["antidelete", "antiDelete"]])
        (config[key] ? onList : offList).push(name);
      await reply(`┌─ MENU\n│ ON: ${onList.join(", ") || "-"}\n│ OFF: ${offList.join(", ") || "-"}\n├─ #on/#off <fitur>\n├─ #add/#remove <blacklist|whitelist|emojis> <nilai>\n├─ #info #backup\n└─ ViewOnce: balas sekali-lihat dgn teks apa pun → simpan lokal (http://localhost:3456)`);
      break;
    }
    case "vo": case "vv": case "viewonce": case "view_once":
      await handleViewOnce(sock, msg, myJid, reply); break;
    case "info": {
      const on = (v) => (v ? "ON" : "OFF");
      await reply(`*INFO BOT*\nAutoread:${on(config.autoReadStatus)} Autolike:${on(config.autoLikeStatus)} DL:${on(config.downloadMediaStatus)}\nSensor:${on(config.sensorNomor)} AntiTelpon:${on(config.antiTelpon)} KickStory:${on(config.autoKickStory)} AntiDel:${on(config.antiDelete)}\nBlacklist: ${config.blackList.length ? config.blackList.map(sensorNum).join(", ") : "kosong"}\nWhitelist: ${config.whiteList.length ? config.whiteList.map(sensorNum).join(", ") : "semua"}\nEmoji: ${config.emojis.join(" ")}\nDashboard lokal: http://localhost:3456\nViewOnce: balas sekali-lihat → tersimpan lokal`);
      break;
    }
    case "backup": case "backupnow": case "save": {
      const ok = backupSessions(true);
      await reply(ok ? `Backup berhasil.` : `Backup tidak perlu (belum berubah).`);
      break;
    }
  }
}
module.exports = { handleCommand };
