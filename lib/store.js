const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let dataDir = "";
let dbFile = "";
let db = null;
let secret = "";

const COLLECTIONS = [
  "users", "tokens", "designs", "palettes", "templates", "preflights", "versions",
  "auditLogs", "feedback"
];

function init(dir) {
  dataDir = dir;
  fs.mkdirSync(dir, { recursive: true });
  dbFile = path.join(dir, "db.json");
  const secretFile = path.join(dir, "secret.key");
  if (fs.existsSync(secretFile)) {
    secret = fs.readFileSync(secretFile, "utf8").trim();
  } else {
    secret = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(secretFile, secret, "utf8");
  }
  if (fs.existsSync(dbFile)) {
    db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } else {
    const seed = require("./seed");
    db = seed.build(secret, dir);
    save();
  }
  normalize();
}

function normalize() {
  COLLECTIONS.forEach(function (key) {
    if (!Array.isArray(db[key])) db[key] = [];
  });
  if (!db.settings) db.settings = {};
  if (!db.meta) db.meta = { createdAt: new Date().toISOString(), version: 1 };
}

function save() {
  const temp = dbFile + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(temp, dbFile);
}

function id(prefix) {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return prefix + "-" + stamp + "-" + rand;
}

function now() {
  return new Date().toISOString();
}

function getSecret() {
  return secret;
}

function dataPath() {
  return dataDir;
}

module.exports = {
  init: init,
  save: save,
  id: id,
  now: now,
  getSecret: getSecret,
  dataPath: dataPath,
  get db() {
    return db;
  }
};

