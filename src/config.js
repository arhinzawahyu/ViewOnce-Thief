const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "..", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
if (typeof config.antiDelete === "undefined") config.antiDelete = false;
if (typeof config.autoReadStatus === "undefined") config.autoReadStatus = false;
if (typeof config.autoLikeStatus === "undefined") config.autoLikeStatus = false;
if (typeof config.downloadMediaStatus === "undefined") config.downloadMediaStatus = true;
if (!Array.isArray(config.blackList)) config.blackList = [];
if (!Array.isArray(config.whiteList)) config.whiteList = [];
if (!Array.isArray(config.emojis)) config.emojis = ["💖", "👍", "🙏"];
function updateConfig(k, v) { config[k] = v; fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf-8"); }
function sensorNum(n) { const s = String(n ?? ""); return config.sensorNomor ? s.slice(0, 3) + "****" + s.slice(-2) : s; }
module.exports = { config, updateConfig, sensorNum };
