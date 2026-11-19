const fs = require("fs");
const path = require("path");

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function readBody(req, limit, callback) {
  let size = 0;
  const chunks = [];
  req.on("data", function (chunk) {
    size += chunk.length;
    if (size > limit) {
      callback(new Error("too large"));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", function () {
    callback(null, Buffer.concat(chunks).toString("utf8"));
  });
  req.on("error", function (error) {
    callback(error);
  });
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "127.0.0.1";
}

function parseJson(body) {
  if (!body || !body.trim()) return {};
  return JSON.parse(body);
}

function safeFilename(name) {
  return String(name || "download").replace(/[\\/:*?"<>|]/g, "_");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fileSize(file) {
  try {
    return fs.statSync(file).size;
  } catch (e) {
    return 0;
  }
}

function relative(root, file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

module.exports = {
  sendJson: sendJson,
  readBody: readBody,
  clientIp: clientIp,
  parseJson: parseJson,
  safeFilename: safeFilename,
  ensureDir: ensureDir,
  fileSize: fileSize,
  relative: relative
};

