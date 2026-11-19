const crypto = require("crypto");
const store = require("./store");
const audit = require("./audit");
const layout = require("./layoutService");

const LAYER_TYPES = ["text", "rect", "ellipse", "mask"];

function canAccess(user, design) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (design.ownerId === user.id) return true;
  if (design.status === "active") return true;
  if (user.role === "VIEWER" && design.shareToken && design.shareExpiresAt > Date.now()) return true;
  return false;
}

function enrich(design, withLayers) {
  const layers = Array.isArray(design.layers) ? design.layers : [];
  const result = Object.assign({}, design, {
    layerCount: layers.length,
    textCount: layers.filter(function (item) { return item.type === "text"; }).length,
    bbox: layout.bbox(layers),
    guides: layout.goldenGuides(design.width, design.height)
  });
  if (!withLayers) delete result.layers;
  return result;
}

function validate(body, current) {
  const name = String(body.name === undefined ? (current ? current.name : "") : body.name).trim();
  const code = String(body.code === undefined ? (current ? current.code : "") : body.code).trim();
  const width = Number(body.width === undefined ? (current ? current.width : 0) : body.width);
  const height = Number(body.height === undefined ? (current ? current.height : 0) : body.height);
  const dpi = Number(body.dpi === undefined ? (current ? current.dpi : 300) : body.dpi);
  const background = String(body.background === undefined ? (current ? current.background : "#FFFFFF") : body.background).toUpperCase();
  const bleed = Number(body.bleed === undefined ? (current ? current.bleed : 3) : body.bleed);
  const templateId = String(body.templateId === undefined ? (current ? current.templateId : "") : body.templateId);
  const paletteId = String(body.paletteId === undefined ? (current ? current.paletteId : "") : body.paletteId);
  const description = String(body.description === undefined ? (current ? current.description : "") : body.description).trim();
  if (name.length < 2 || name.length > 40) return { error: "项目名称应为2到40个字符", field: "name" };
  if (!/^[A-Za-z0-9-]{2,40}$/.test(code)) return { error: "项目编码应为2到40位字母、数字或连字符", field: "code" };
  for (const item of [["width", width], ["height", height]]) {
    if (!Number.isFinite(item[1]) || item[1] < 100 || item[1] > 10000) return { error: item[0] + " 应在100到10000像素之间", field: item[0] };
  }
  if (!Number.isFinite(dpi) || dpi < 72 || dpi > 600) return { error: "DPI应在72到600之间", field: "dpi" };
  if (!/^#[0-9A-F]{6}$/.test(background)) return { error: "背景色应为#RRGGBB", field: "background" };
  if (!Number.isFinite(bleed) || bleed < 0 || bleed > 10) return { error: "出血应在0到10毫米之间", field: "bleed" };
  if (description.length > 200) return { error: "说明不能超过200个字符", field: "description" };
  return {
    name: name, code: code, width: width, height: height, dpi: dpi,
    background: background, bleed: bleed, templateId: templateId, paletteId: paletteId, description: description
  };
}

function list(ctx) {
  const query = ctx.query;
  const keyword = (query.get("keyword") || "").trim();
  const templateId = query.get("templateId") || "";
  const status = query.get("status") || "";
  let rows = store.db.designs.filter(function (design) { return canAccess(ctx.user, design); });
  if (keyword) rows = rows.filter(function (design) { return (design.name + design.code + design.description).indexOf(keyword) >= 0; });
  if (templateId) rows = rows.filter(function (design) { return design.templateId === templateId; });
  if (status) rows = rows.filter(function (design) { return design.status === status; });
  rows.sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(50, Math.max(5, Number(query.get("size") || 10)));
  ctx.ok({
    total: rows.length,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size).map(function (design) { return enrich(design, false); }),
    summary: {
      total: store.db.designs.length,
      active: store.db.designs.filter(function (item) { return item.status === "active"; }).length,
      archived: store.db.designs.filter(function (item) { return item.status === "archived"; }).length,
      palettes: store.db.palettes.filter(function (item) { return item.enabled; }).length
    },
    templates: store.db.templates.map(function (item) { return { id: item.id, name: item.name, category: item.category }; })
  });
}

function detail(ctx) {
  const design = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!design || !canAccess(ctx.user, design)) {
    ctx.fail(404, "项目不存在或无权访问");
    return;
  }
  ctx.ok({
    design: enrich(design, true),
    palettes: store.db.palettes.filter(function (item) { return item.enabled; }),
    templates: store.db.templates,
    versions: store.db.versions.filter(function (item) { return item.designId === design.id; }),
    preflights: store.db.preflights.filter(function (item) { return item.designId === design.id; }),
    layerTypes: LAYER_TYPES,
    guides: layout.goldenGuides(design.width, design.height)
  });
}

function create(ctx) {
  const body = ctx.body || {};
  const result = validate(body, null);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  const duplicate = store.db.designs.find(function (item) { return item.code === result.code; });
  if (duplicate) {
    ctx.fail(409, "项目编码已存在", "code");
    return;
  }
  if (result.paletteId) {
    const palette = store.db.palettes.find(function (item) { return item.id === result.paletteId && item.enabled; });
    if (!palette) {
      ctx.fail(400, "请选择启用的色板", "paletteId");
      return;
    }
  }
  let layers = [];
  let templateName = "";
  if (result.templateId) {
    const template = store.db.templates.find(function (item) { return item.id === result.templateId; });
    if (!template) {
      ctx.fail(400, "模板不存在", "templateId");
      return;
    }
    templateName = template.name;
    layers = JSON.parse(JSON.stringify(template.layers)).map(function (layer, index) {
      layer.id = "LYR-" + Date.now().toString(36) + "-" + index;
      return layer;
    });
  }
  const design = Object.assign({
    id: store.id("DSG"),
    status: "active",
    ownerId: ctx.user.id,
    ownerName: ctx.user.name,
    templateName: templateName,
    layers: layers,
    shareToken: "",
    shareExpiresAt: 0,
    versionCount: 0,
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now(),
    updatedAt: store.now()
  }, result);
  store.db.designs.unshift(design);
  store.save();
  audit.write(ctx.user, "项目", "创建项目", design.name, design.code, ctx.req);
  ctx.ok({ design: enrich(design, true) });
}

function update(ctx) {
  const design = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && design.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以修改");
    return;
  }
  const result = validate(ctx.body || {}, design);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  if (result.code !== design.code) {
    const duplicate = store.db.designs.find(function (item) { return item.code === result.code && item.id !== design.id; });
    if (duplicate) {
      ctx.fail(409, "项目编码已存在", "code");
      return;
    }
  }
  if (result.paletteId) {
    const palette = store.db.palettes.find(function (item) { return item.id === result.paletteId && item.enabled; });
    if (!palette) {
      ctx.fail(400, "请选择启用的色板", "paletteId");
      return;
    }
  }
  Object.assign(design, result, { updatedAt: store.now() });
  if (ctx.body && ctx.body.status !== undefined && ["active", "archived"].indexOf(String(ctx.body.status)) >= 0) {
    design.status = String(ctx.body.status);
  }
  store.save();
  audit.write(ctx.user, "项目", "修改项目", design.name, design.code, ctx.req);
  ctx.ok({ design: enrich(design, true) });
}

function archive(ctx) {
  const design = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && design.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以归档");
    return;
  }
  design.status = design.status === "archived" ? "active" : "archived";
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "项目", design.status === "archived" ? "归档项目" : "恢复项目", design.name, "", ctx.req);
  ctx.ok({ design: design });
}

function duplicate(ctx) {
  const source = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!source || !canAccess(ctx.user, source)) {
    ctx.fail(404, "项目不存在或无权访问");
    return;
  }
  const layers = JSON.parse(JSON.stringify(source.layers || [])).map(function (layer, index) {
    layer.id = "LYR-" + Date.now().toString(36) + "-c" + index;
    return layer;
  });
  const design = Object.assign({}, source, {
    id: store.id("DSG"),
    name: source.name + "（副本）",
    code: source.code + "-copy-" + Date.now().toString(36),
    status: "active",
    layers: layers,
    ownerId: ctx.user.id,
    ownerName: ctx.user.name,
    shareToken: "",
    shareExpiresAt: 0,
    versionCount: 0,
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now(),
    updatedAt: store.now()
  });
  store.db.designs.unshift(design);
  store.save();
  audit.write(ctx.user, "项目", "复制项目", source.name, design.code, ctx.req);
  ctx.ok({ design: enrich(design, false) });
}

function share(ctx) {
  const design = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && design.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以分享");
    return;
  }
  design.shareToken = crypto.randomBytes(16).toString("hex");
  design.shareExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "分享", "生成分享链接", design.name, "有效期24小时", ctx.req);
  ctx.ok({
    token: design.shareToken,
    expiresAt: design.shareExpiresAt,
    url: "/share.html?token=" + design.shareToken
  });
}

function publicShare(ctx) {
  const design = store.db.designs.find(function (item) { return item.shareToken === ctx.params[0]; });
  if (!design) {
    ctx.fail(404, "分享链接不存在");
    return;
  }
  if (!design.shareExpiresAt || design.shareExpiresAt < Date.now()) {
    ctx.fail(410, "分享链接已过期");
    return;
  }
  ctx.ok({
    design: enrich(design, true),
    ownerName: design.ownerName,
    shareExpiresAt: design.shareExpiresAt
  });
}

module.exports = {
  LAYER_TYPES: LAYER_TYPES,
  canAccess: canAccess,
  validate: validate,
  enrich: enrich,
  list: list,
  detail: detail,
  create: create,
  update: update,
  archive: archive,
  duplicate: duplicate,
  share: share,
  publicShare: publicShare
};
