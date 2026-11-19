const store = require("./store");
const audit = require("./audit");

const TYPES = ["问题", "建议", "其他"];
const STATUS_NAMES = { pending: "待处理", replied: "已回复", closed: "已关闭" };

function list(ctx) {
  const query = ctx.query;
  const status = query.get("status") || "";
  let rows = store.db.feedback.slice();
  if (ctx.user.role !== "ADMIN") rows = rows.filter(function (item) { return item.userId === ctx.user.id; });
  if (status) rows = rows.filter(function (item) { return item.status === status; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  ctx.ok({
    total: rows.length,
    rows: rows.map(function (item) {
      return Object.assign({}, item, { statusName: STATUS_NAMES[item.status] || item.status });
    })
  });
}

function create(ctx) {
  const body = ctx.body || {};
  const type = String(body.type || "");
  const content = String(body.content || "").trim();
  if (TYPES.indexOf(type) < 0) {
    ctx.fail(400, "请选择反馈类型", "type");
    return;
  }
  if (content.length < 5 || content.length > 500) {
    ctx.fail(400, "反馈内容长度应为5到500个字符", "content");
    return;
  }
  const item = {
    id: store.id("FB"),
    userId: ctx.user.id,
    userName: ctx.user.name,
    role: ctx.user.role,
    type: type,
    content: content,
    status: "pending",
    reply: "",
    replier: "",
    createdAt: store.now(),
    repliedAt: ""
  };
  store.db.feedback.push(item);
  store.save();
  audit.write(ctx.user, "反馈", "提交" + type, item.id, content.slice(0, 40), ctx.req);
  ctx.ok({ item: item });
}

function reply(ctx) {
  const item = store.db.feedback.find(function (entry) { return entry.id === ctx.params[0]; });
  if (!item) {
    ctx.fail(404, "反馈不存在");
    return;
  }
  const reply = String((ctx.body || {}).reply || "").trim();
  if (reply.length < 2 || reply.length > 300) {
    ctx.fail(400, "回复内容长度应为2到300个字符", "reply");
    return;
  }
  item.reply = reply;
  item.replier = ctx.user.name;
  item.status = "replied";
  item.repliedAt = store.now();
  store.save();
  audit.write(ctx.user, "反馈", "回复反馈", item.id, reply.slice(0, 40), ctx.req);
  ctx.ok({ item: item });
}

function close(ctx) {
  const item = store.db.feedback.find(function (entry) { return entry.id === ctx.params[0]; });
  if (!item) {
    ctx.fail(404, "反馈不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && item.userId !== ctx.user.id) {
    ctx.fail(403, "无权关闭该反馈");
    return;
  }
  item.status = "closed";
  store.save();
  audit.write(ctx.user, "反馈", "关闭反馈", item.id, "", ctx.req);
  ctx.ok({ item: item });
}

module.exports = {
  TYPES: TYPES,
  list: list,
  create: create,
  reply: reply,
  close: close
};
