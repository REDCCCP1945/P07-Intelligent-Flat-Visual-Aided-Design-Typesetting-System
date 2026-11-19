const store = require("./store");
const httpUtil = require("./http");

function write(user, category, action, target, detail, req) {
  const entry = {
    id: store.id("LOG"),
    userId: user ? user.id : null,
    username: user ? user.username : "anonymous",
    role: user ? user.role : "-",
    category: category,
    action: action,
    target: target || "",
    detail: detail || "",
    ip: req ? httpUtil.clientIp(req) : "127.0.0.1",
    createdAt: store.now()
  };
  store.db.auditLogs.push(entry);
  if (store.db.auditLogs.length > 5000) {
    store.db.auditLogs = store.db.auditLogs.slice(-4500);
  }
  return entry;
}

function list(ctx) {
  const query = ctx.query;
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(100, Math.max(5, Number(query.get("size") || 20)));
  const category = query.get("category") || "";
  const role = query.get("role") || "";
  const keyword = (query.get("keyword") || "").trim();
  let rows = store.db.auditLogs.slice().reverse();
  if (category) rows = rows.filter(function (item) { return item.category === category; });
  if (role) rows = rows.filter(function (item) { return item.role === role; });
  if (keyword) {
    rows = rows.filter(function (item) {
      return (item.username + item.action + item.target + item.detail).indexOf(keyword) >= 0;
    });
  }
  const total = rows.length;
  rows = rows.slice((page - 1) * size, page * size);
  ctx.ok({ total: total, page: page, size: size, rows: rows });
}

module.exports = {
  write: write,
  list: list
};

