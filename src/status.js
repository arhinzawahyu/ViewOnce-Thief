const { jidNormalizedUser } = require("@whiskeysockets/baileys");
const { config, sensorNum } = require("./config");
const { state } = require("./state");
const { safeDownloadMedia } = require("./media");
const { saveLocalMedia } = require("./localdb");
const { DASH_URL } = require("./dashboard");
const { logCuy, logErrorToFile } = require("./logger");

async function handleStatus(sock, msg) {
  const loggedInNumber = state.loggedInNumber; if(!loggedInNumber) return;
  let senderNumber = msg.key.remoteJidAlt ? msg.key.remoteJidAlt.split("@")[0] : "Tidak diketahui";
  const senderName = msg.pushName || "Tidak diketahui";
  const displaySenderNumber = senderNumber !== "Tidak diketahui" ? sensorNum(senderNumber) : senderNumber;
  if (msg.message.protocolMessage) return;
  if (msg.message.reactionMessage) return;
  if (config.blackList.includes(senderNumber)) return;
  if (config.whiteList.length > 0 && !config.whiteList.includes(senderNumber)) return;
  if (!msg.key.remoteJid || !msg.key.remoteJidAlt) return;
  const myself = jidNormalizedUser(sock.user.id);
  const myjid = `${loggedInNumber}@s.whatsapp.net`;
  const emojiToReact = config.emojis[Math.floor(Math.random() * config.emojis.length)];
  try {
    await sock.readMessages([msg.key]);
    if (config.autoLikeStatus) await sock.sendMessage(msg.key.remoteJid, { react: { key: msg.key, text: emojiToReact } }, { statusJidList: [msg.key.remoteJidAlt, myself] });
    const caption = msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || msg.message.extendedTextMessage?.text || "Tidak ada caption";
    if (config.downloadMediaStatus && (msg.type === "imageMessage" || msg.type === "videoMessage" || msg.type === "audioMessage")) {
      const mediaType = msg.type === "imageMessage" ? "image" : msg.type === "videoMessage" ? "video" : "audio";
      const buf = await safeDownloadMedia(sock, msg, mediaType);
      if (buf) {
        const saved = saveLocalMedia(buf, { kind:"status", media_type:mediaType, sender:senderNumber, name:senderName, caption, mime: mediaType==="video"?"video/mp4":mediaType==="audio"?"audio/ogg":"image/jpeg", created_at:new Date().toISOString() });
        await sock.sendMessage(myjid, { text: `Status ${mediaType} dari ${senderName} (${displaySenderNumber}) tersimpan lokal (id ${saved?.id||"-"}). Buka: ${DASH_URL}` });
      }
    }
  } catch(e){ logErrorToFile(`handle status: ${e.message}`); }
}
module.exports = { handleStatus };
