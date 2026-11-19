const store = require("./store");
const audit = require("./audit");
const layout = require("./layoutService");

function list(ctx) {
  const rows = store.db.palettes.map(function (item) {
    return Object.assign({}, item, {
      colorCount: (item.colors || []).length,
      designCount: store.db.designs.filter(function (design) { return design.paletteId === item.id; }).length
    });
  });
  ctx.ok({ rows: rows });
}

function validate(body, current) {
  const name = String(body.name === undefined ? (current ? current.name : "") : body.name).trim();
  const colors = Array.isArray(body.colors) ? body.colors : (current ? current.colors : []);
  const description = String(body.description === undefined ? (current ? current.description : "") : body.description).trim();
  if (name.length < 2 || name.length > 30) return { error: "色板名称应为2到30个字符", field: "name" };
  if (colors.length < 2 || colors.length > 12) return { error: "色板应包含2到12个颜色", field: "colors" };
  for (const color of colors) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(String(color))) return { error: "颜色应为#RRGGBB", field: "colors" };
  }
  if (description.length > 200) return { error: "说明不能超过200个字符", field: "description" };
  return {
    name: name,
    colors: colors.map(function (color) { return String(color).toUpperCase(); }),
    description: description
  };
}

function harmony(colors) {
  if (colors.length < 2) return 100;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      total += layout.contrastRatio(colors[i], colors[j]);
      pairs += 1;
    }
  }
  return layout.round(Math.min(100, total / pairs / 21 * 100), 1);
}

function create(ctx) {
  const result = validate(ctx.body || {}, null);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  if (store.db.palettes.some(function (item) { return item.name === result.name; })) {
    ctx.fail(409, "色板名称已存在", "name");
    return;
  }
  const row = Object.assign({ id: store.id("PAL"), enabled: true, createdAt: store.now() }, result, { harmony: harmony(result.colors) });
  store.db.palettes.push(row);
  store.save();
  audit.write(ctx.user, "色板", "新增色板", row.name, String(row.colorCount || result.colors.length), ctx.req);
  ctx.ok({ palette: row });
}

function update(ctx) {
  const row = store.db.palettes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "色板不存在");
    return;
  }
  const result = validate(ctx.body || {}, row);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  const duplicate = store.db.palettes.find(function (item) { return item.name === result.name && item.id !== row.id; });
  if (duplicate) {
    ctx.fail(409, "色板名称已存在", "name");
    return;
  }
  Object.assign(row, result, { harmony: harmony(result.colors), updatedAt: store.now() });
  store.save();
  audit.write(ctx.user, "色板", "修改色板", row.name, "", ctx.req);
  ctx.ok({ palette: row });
}

function toggle(ctx) {
  const row = store.db.palettes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "色板不存在");
    return;
  }
  row.enabled = !row.enabled;
  row.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "色板", row.enabled ? "启用色板" : "停用色板", row.name, "", ctx.req);
  ctx.ok({ palette: row });
}

function remove(ctx) {
  const row = store.db.palettes.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "色板不存在");
    return;
  }
  const used = store.db.designs.some(function (design) { return design.paletteId === row.id; });
  if (used) {
    ctx.fail(409, "该色板已被项目引用，只能停用");
    return;
  }
  store.db.palettes = store.db.palettes.filter(function (item) { return item.id !== row.id; });
  store.save();
  audit.write(ctx.user, "色板", "删除色板", row.name, "", ctx.req);
  ctx.ok({});
}

module.exports = {
  validate: validate,
  harmony: harmony,
  list: list,
  create: create,
  update: update,
  toggle: toggle,
  remove: remove
};
