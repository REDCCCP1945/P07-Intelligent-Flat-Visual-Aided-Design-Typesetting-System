const crypto = require("crypto");
const store = require("./store");
const audit = require("./audit");

const LOCK_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const loginFails = new Map();

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), String(salt), 64).toString("hex");
}

function createSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function sign(payload) {
  return crypto.createHmac("sha256", store.getSecret()).update(payload).digest("base64url");
}

function issueToken(user) {
  const payload = JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + TOKEN_TTL_MS });
  const encoded = Buffer.from(payload).toString("base64url");
  const token = encoded + "." + sign(encoded);
  store.db.tokens.push({ token: token, userId: user.id, expiresAt: Date.now() + TOKEN_TTL_MS });
  if (store.db.tokens.length > 500) {
    store.db.tokens = store.db.tokens.slice(-400);
  }
  store.save();
  return token;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const expected = sign(parts[0]);
  if (expected.length !== parts[1].length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1]))) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!payload.exp || payload.exp < Date.now()) return null;
  const record = store.db.tokens.find(function (item) { return item.token === token; });
  if (!record) return null;
  const user = store.db.users.find(function (item) { return item.id === payload.uid; });
  if (!user || user.status !== "active") return null;
  return user;
}

function fromRequest(req) {
  const header = req.headers["authorization"] || "";
  let token = "";
  if (header.indexOf("Bearer ") === 0) token = header.slice(7).trim();
  if (!token && req.headers["x-token"]) token = String(req.headers["x-token"]);
  if (!token && req.url) {
    const index = req.url.indexOf("token=");
    if (index >= 0) token = decodeURIComponent(req.url.slice(index + 6).split("&")[0]);
  }
  return verifyToken(token);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    email: user.email,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

function menusFor(role) {
  const map = store.db.settings.roleMenus || {};
  const list = map[role];
  if (!list) return [];
  return list.slice();
}

function login(ctx) {
  const body = ctx.body || {};
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    ctx.fail(400, "请输入用户名和密码", "username");
    return;
  }
  const key = username.toLowerCase();
  const fail = loginFails.get(key);
  if (fail && fail.count >= MAX_FAILS && Date.now() - fail.last < LOCK_WINDOW_MS) {
    ctx.fail(423, "连续登录失败次数过多，请10分钟后再试");
    return;
  }
  const user = store.db.users.find(function (item) { return item.username.toLowerCase() === key; });
  if (!user) {
    recordFail(key);
    ctx.fail(401, "用户名或密码错误");
    return;
  }
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    recordFail(key);
    ctx.fail(401, "用户名或密码错误");
    return;
  }
  if (user.status !== "active") {
    ctx.fail(403, "该账号已被停用，请联系系统管理员");
    return;
  }
  loginFails.delete(key);
  user.lastLoginAt = store.now();
  const token = issueToken(user);
  store.save();
  audit.write(user, "认证", "登录", "登录系统", "角色" + user.role, ctx.req);
  ctx.ok({ token: token, user: publicUser(user), menus: menusFor(user.role) });
}

function recordFail(key) {
  const current = loginFails.get(key) || { count: 0, last: 0 };
  current.count += 1;
  current.last = Date.now();
  loginFails.set(key, current);
}

function me(ctx) {
  ctx.ok({ user: publicUser(ctx.user), menus: menusFor(ctx.user.role) });
}

function logout(ctx) {
  const header = ctx.req.headers["authorization"] || "";
  const token = header.indexOf("Bearer ") === 0 ? header.slice(7).trim() : "";
  store.db.tokens = store.db.tokens.filter(function (item) { return item.token !== token; });
  store.save();
  audit.write(ctx.user, "认证", "退出", "退出系统", "", ctx.req);
  ctx.ok({});
}

function changePassword(ctx) {
  const body = ctx.body || {};
  const oldPassword = String(body.oldPassword || "");
  const newPassword = String(body.newPassword || "");
  if (!oldPassword || !newPassword) {
    ctx.fail(400, "请填写原密码与新密码");
    return;
  }
  if (hashPassword(oldPassword, ctx.user.salt) !== ctx.user.passwordHash) {
    ctx.fail(400, "原密码不正确", "oldPassword");
    return;
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
    ctx.fail(400, "新密码至少8位，且包含大写字母、小写字母和数字", "newPassword");
    return;
  }
  ctx.user.salt = createSalt();
  ctx.user.passwordHash = hashPassword(newPassword, ctx.user.salt);
  store.db.tokens = store.db.tokens.filter(function (item) { return item.userId !== ctx.user.id; });
  store.save();
  audit.write(ctx.user, "认证", "修改密码", ctx.user.username, "密码已更新", ctx.req);
  ctx.ok({ message: "密码已更新，请重新登录" });
}

module.exports = {
  login: login,
  me: me,
  logout: logout,
  changePassword: changePassword,
  hashPassword: hashPassword,
  createSalt: createSalt,
  fromRequest: fromRequest,
  publicUser: publicUser,
  menusFor: menusFor
};

