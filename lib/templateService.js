const store = require("./store");
const audit = require("./audit");

const CATEGORIES = ["social", "poster", "card", "slide", "print"];
const CATEGORY_NAMES = { social: "社交媒体", poster: "海报", card: "卡片", slide: "演示", print: "印刷品" };

function list(ctx) {
  const rows = store.db.templates.map(function (item) {
    return Object.assign({}, item, {
      categoryName: CATEGORY_NAMES[item.category] || item.category,
      layerCount: (item.layers || []).length,
      designCount: store.db.designs.filter(function (design) { return design.templateId === item.id; }).length
    });
  });
  ctx.ok({ rows: rows, categories: CATEGORIES, categoryNames: CATEGORY_NAMES });
}

function apply(ctx) {
  const template = store.db.templates.find(function (item) { return item.id === ctx.params[0]; });
  if (!template) {
    ctx.fail(404, "模板不存在");
    return;
  }
  const body = ctx.body || {};
  const design = store.db.designs.find(function (item) { return item.id === body.designId; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && design.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以应用模板");
    return;
  }
  if (String(body.mode || "replace") === "append") {
    const appended = JSON.parse(JSON.stringify(template.layers || [])).map(function (layer, index) {
      layer.id = store.id("LYR") + index;
      return layer;
    });
    design.layers = (design.layers || []).concat(appended);
  } else {
    design.layers = JSON.parse(JSON.stringify(template.layers || [])).map(function (layer, index) {
      layer.id = store.id("LYR") + index;
      return layer;
    });
    design.width = template.width;
    design.height = template.height;
    design.templateId = template.id;
    design.templateName = template.name;
  }
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "模板", "应用模板", design.name, template.name, ctx.req);
  ctx.ok({ design: design, template: template });
}

module.exports = {
  CATEGORIES: CATEGORIES,
  CATEGORY_NAMES: CATEGORY_NAMES,
  list: list,
  apply: apply
};
