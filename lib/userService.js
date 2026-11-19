const store = require("./store");
const auth = require("./auth");
const audit = require("./audit");

const ROLES = ["ADMIN", "DESIGNER", "VIEWER"];
const ROLE_NAMES = { ADMIN: "系统管理员", DESIGNER: "视觉设计师", VIEWER: "审核访客" };

function list(ctx) {
  const rows = store.db.users.map(function (item) {
    return Object.assign(auth.publicUser(item), { roleName: ROLE_NAMES[item.role] || item.role });
  });
  ctx.ok({ total: rows.length, rows: rows, roles: ROLES, roleNames: ROLE_NAMES });
}

function create(ctx) {
  const body = ctx.body || {};
  const username = String(body.username || "").trim();
  const name = String(body.name || "").trim();
  const role = String(body.role || "");
  const password = String(body.password || "");
  if (!/^[A-Za-z0-9_]{4,20}$/.test(username)) {
    ctx.fail(400, "用户名应为4到20位字母、数字或下划线", "username");
    return;
  }
  if (name.length < 2 || name.length > 20) {
    ctx.fail(400, "姓名长度应为2到20个字符", "name");
    return;
  }
  if (ROLES.indexOf(role) < 0) {
    ctx.fail(400, "请选择有效角色", "role");
    return;
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    ctx.fail(400, "初始密码至少8位，且包含大写字母、小写字母和数字", "password");
    return;
  }
  if (store.db.users.some(function (item) { return item.username.toLowerCase() === username.toLowerCase(); })) {
    ctx.fail(409, "用户名已存在", "username");
    return;
  }
  const salt = auth.createSalt();
  const user = {
    id: store.id("USR"), username: username, name: name, role: role,
    email: String(body.email || "").trim(), status: "active", salt: salt,
    passwordHash: auth.hashPassword(password, salt), createdAt: store.now(), lastLoginAt: ""
  };
  store.db.users.push(user);
  store.save();
  audit.write(ctx.user, "用户管理", "新增用户", username, "角色" + ROLE_NAMES[role], ctx.req);
  ctx.ok({ user: auth.publicUser(user) });
}

function toggle(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.params[0]; });
  if (!user) {
    ctx.fail(404, "用户不存在");
    return;
  }
  if (user.username === "admin01") {
    ctx.fail(409, "内置管理员账号不能停用");
    return;
  }
  user.status = user.status === "active" ? "disabled" : "active";
  if (user.status === "disabled") {
    store.db.tokens = store.db.tokens.filter(function (item) { return item.userId !== user.id; });
  }
  store.save();
  audit.write(ctx.user, "用户管理", user.status === "active" ? "启用用户" : "停用用户", user.username, "", ctx.req);
  ctx.ok({ user: auth.publicUser(user) });
}

function resetPassword(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.params[0]; });
  if (!user) {
    ctx.fail(404, "用户不存在");
    return;
  }
  const password = String((ctx.body || {}).password || "");
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    ctx.fail(400, "新密码至少8位，且包含大写字母、小写字母和数字", "password");
    return;
  }
  user.salt = auth.createSalt();
  user.passwordHash = auth.hashPassword(password, user.salt);
  store.db.tokens = store.db.tokens.filter(function (item) { return item.userId !== user.id; });
  store.save();
  audit.write(ctx.user, "用户管理", "重置密码", user.username, "", ctx.req);
  ctx.ok({});
}

function changeRole(ctx) {
  const user = store.db.users.find(function (item) { return item.id === ctx.params[0]; });
  if (!user) {
    ctx.fail(404, "用户不存在");
    return;
  }
  const role = String((ctx.body || {}).role || "");
  if (ROLES.indexOf(role) < 0) {
    ctx.fail(400, "角色无效", "role");
    return;
  }
  if (user.username === "admin01" && role !== "ADMIN") {
    ctx.fail(409, "内置管理员账号角色不能变更");
    return;
  }
  user.role = role;
  store.db.tokens = store.db.tokens.filter(function (item) { return item.userId !== user.id; });
  store.save();
  audit.write(ctx.user, "用户管理", "变更角色", user.username, "新角色" + ROLE_NAMES[role], ctx.req);
  ctx.ok({ user: auth.publicUser(user) });
}

function profile(ctx) {
  ctx.ok({ user: auth.publicUser(ctx.user), roleName: ROLE_NAMES[ctx.user.role] || ctx.user.role });
}

function updateProfile(ctx) {
  const body = ctx.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  if (name.length < 2 || name.length > 20) {
    ctx.fail(400, "姓名长度应为2到20个字符", "name");
    return;
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    ctx.fail(400, "邮箱格式不正确", "email");
    return;
  }
  ctx.user.name = name;
  ctx.user.email = email;
  store.save();
  audit.write(ctx.user, "个人中心", "修改资料", ctx.user.username, "", ctx.req);
  ctx.ok({ user: auth.publicUser(ctx.user) });
}

function exportBackup(ctx) {
  const copy = JSON.parse(JSON.stringify(store.db));
  copy.tokens = [];
  copy.users = copy.users.map(function (item) {
    const row = Object.assign({}, item);
    delete row.salt;
    delete row.passwordHash;
    return row;
  });
  const content = JSON.stringify(copy, null, 2);
  audit.write(ctx.user, "系统管理", "导出数据备份", "db.json", "项目" + copy.designs.length + "个，预检" + copy.preflights.length + "份", ctx.req);
  ctx.res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": "attachment; filename=\"layout-design-backup-" + new Date().toISOString().slice(0, 10) + ".json\"",
    "Content-Length": Buffer.byteLength(content)
  });
  ctx.res.end(content);
}

module.exports = {
  ROLES: ROLES,
  ROLE_NAMES: ROLE_NAMES,
  list: list,
  create: create,
  toggle: toggle,
  resetPassword: resetPassword,
  changeRole: changeRole,
  profile: profile,
  updateProfile: updateProfile,
  exportBackup: exportBackup
};
