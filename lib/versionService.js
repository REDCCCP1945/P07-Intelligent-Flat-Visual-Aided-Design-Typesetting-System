const store = require("./store");
const audit = require("./audit");

function list(ctx) {
  const designId = ctx.query.get("designId") || "";
  let rows = store.db.versions.slice();
  if (designId) rows = rows.filter(function (item) { return item.designId === designId; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  ctx.ok({ rows: rows });
}

function create(ctx) {
  const body = ctx.body || {};
  const design = store.db.designs.find(function (item) { return item.id === body.designId; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  const label = String(body.label || "未命名版本").trim().slice(0, 40);
  const row = {
    id: store.id("VER"),
    designId: design.id,
    label: label,
    snapshot: {
      width: design.width, height: design.height, dpi: design.dpi,
      background: design.background, bleed: design.bleed,
      layerCount: (design.layers || []).length,
      checksum: (design.layers || []).map(function (item) {
        return item.type + ":" + item.x + "," + item.y + "," + item.width + "," + item.height;
      }).join("|")
    },
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now()
  };
  store.db.versions.unshift(row);
  design.versionCount = store.db.versions.filter(function (item) { return item.designId === design.id; }).length;
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "版本", "保存版本", row.id, label, ctx.req);
  ctx.ok({ version: row });
}

function detail(ctx) {
  const row = store.db.versions.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "版本不存在");
    return;
  }
  ctx.ok({ version: row });
}

function compare(ctx) {
  const left = store.db.versions.find(function (item) { return item.id === ctx.params[0]; });
  const right = store.db.versions.find(function (item) { return item.id === ctx.params[1]; });
  if (!left || !right) {
    ctx.fail(404, "版本不存在");
    return;
  }
  const keys = ["width", "height", "dpi", "background", "bleed", "layerCount", "checksum"];
  const rows = keys.map(function (key) {
    return { field: key, left: left.snapshot[key], right: right.snapshot[key], changed: left.snapshot[key] !== right.snapshot[key] };
  });
  ctx.ok({ left: left, right: right, rows: rows });
}

module.exports = {
  list: list,
  create: create,
  detail: detail,
  compare: compare
};
