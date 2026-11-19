const store = require("./store");
const audit = require("./audit");
const layout = require("./layoutService");

const FONTS = ["SimSun", "SimHei", "KaiTi", "Microsoft YaHei", "Arial"];
const ALIGNS = ["left", "center", "right"];
const MODES = ["left", "centerX", "right", "top", "centerY", "bottom"];

function findDesign(ctx) {
  const design = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return null;
  }
  if (ctx.user.role === "VIEWER") {
    ctx.fail(403, "浏览客户为只读角色");
    return null;
  }
  if (ctx.user.role !== "ADMIN" && design.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以编辑图层");
    return null;
  }
  return design;
}

function validateLayer(body, current, design) {
  const type = String(body.type === undefined ? (current ? current.type : "rect") : body.type);
  const name = String(body.name === undefined ? (current ? current.name : "") : body.name).trim().slice(0, 40);
  const x = Number(body.x === undefined ? (current ? current.x : 0) : body.x);
  const y = Number(body.y === undefined ? (current ? current.y : 0) : body.y);
  const width = Number(body.width === undefined ? (current ? current.width : 100) : body.width);
  const height = Number(body.height === undefined ? (current ? current.height : 100) : body.height);
  const rotation = Number(body.rotation === undefined ? (current ? current.rotation : 0) : body.rotation);
  const opacity = Number(body.opacity === undefined ? (current ? current.opacity : 100) : body.opacity);
  const fill = String(body.fill === undefined ? (current ? current.fill : "#173A5E") : body.fill).toUpperCase();
  const text = String(body.text === undefined ? (current ? current.text : "") : body.text);
  const fontSize = Number(body.fontSize === undefined ? (current ? current.fontSize : 24) : body.fontSize);
  const fontFamily = String(body.fontFamily === undefined ? (current ? current.fontFamily : "SimHei") : body.fontFamily);
  const fontWeight = Number(body.fontWeight === undefined ? (current ? current.fontWeight : 400) : body.fontWeight);
  const lineHeight = Number(body.lineHeight === undefined ? (current ? current.lineHeight : 1.5) : body.lineHeight);
  const align = String(body.align === undefined ? (current ? current.align : "left") : body.align);
  if (["text", "rect", "ellipse", "mask"].indexOf(type) < 0) return { error: "图层类型无效", field: "type" };
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > design.width || Math.abs(y) > design.height) return { error: "图层坐标超出画布范围", field: "x" };
  if (!Number.isFinite(width) || width < 1 || width > 10000) return { error: "图层宽度应在1到10000像素之间", field: "width" };
  if (!Number.isFinite(height) || height < 1 || height > 10000) return { error: "图层高度应在1到10000像素之间", field: "height" };
  if (!Number.isFinite(rotation) || rotation < -180 || rotation > 180) return { error: "旋转应在-180到180度之间", field: "rotation" };
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 100) return { error: "透明度应在0到100之间", field: "opacity" };
  if (!/^#[0-9A-F]{6}$/.test(fill)) return { error: "填充色应为#RRGGBB", field: "fill" };
  if (type === "text") {
    if (text.length < 1 || text.length > 200) return { error: "文本应为1到200个字符", field: "text" };
    if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 200) return { error: "字号应在8到200之间", field: "fontSize" };
    if (FONTS.indexOf(fontFamily) < 0) return { error: "字体不在支持列表内", field: "fontFamily" };
    if ([400, 500, 700].indexOf(fontWeight) < 0) return { error: "字重只支持400、500、700", field: "fontWeight" };
    if (!Number.isFinite(lineHeight) || lineHeight < 1 || lineHeight > 3) return { error: "行高应在1.0到3.0之间", field: "lineHeight" };
    if (ALIGNS.indexOf(align) < 0) return { error: "对齐方式无效", field: "align" };
  }
  return {
    type: type, name: name || (type === "text" ? text.slice(0, 12) : "图层"),
    x: layout.round(x, 2), y: layout.round(y, 2), width: layout.round(width, 2), height: layout.round(height, 2),
    rotation: layout.round(rotation, 2), opacity: layout.round(opacity, 2), fill: fill,
    text: text, fontSize: layout.round(fontSize, 2), fontFamily: fontFamily, fontWeight: fontWeight,
    lineHeight: Number(lineHeight), align: align
  };
}

function list(ctx) {
  const design = store.db.designs.find(function (item) { return item.id === ctx.params[0]; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  ctx.ok({ designId: design.id, layers: design.layers || [], guides: layout.goldenGuides(design.width, design.height) });
}

function create(ctx) {
  const design = findDesign(ctx);
  if (!design) return;
  const result = validateLayer(ctx.body || {}, null, design);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  const layer = Object.assign({ id: store.id("LYR"), createdAt: store.now() }, result);
  design.layers = design.layers || [];
  design.layers.push(layer);
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "图层", "新增图层", design.name, layer.name, ctx.req);
  ctx.ok({ layer: layer, layers: design.layers });
}

function update(ctx) {
  const design = findDesign(ctx);
  if (!design) return;
  const layer = (design.layers || []).find(function (item) { return item.id === ctx.params[1]; });
  if (!layer) {
    ctx.fail(404, "图层不存在");
    return;
  }
  const result = validateLayer(ctx.body || {}, layer, design);
  if (result.error) {
    ctx.fail(400, result.error, result.field);
    return;
  }
  Object.assign(layer, result);
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "图层", "修改图层", design.name, layer.name, ctx.req);
  ctx.ok({ layer: layer, layers: design.layers });
}

function remove(ctx) {
  const design = findDesign(ctx);
  if (!design) return;
  const index = (design.layers || []).findIndex(function (item) { return item.id === ctx.params[1]; });
  if (index < 0) {
    ctx.fail(404, "图层不存在");
    return;
  }
  const layer = design.layers.splice(index, 1)[0];
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "图层", "删除图层", design.name, layer.name, ctx.req);
  ctx.ok({ layers: design.layers });
}

function move(ctx) {
  const design = findDesign(ctx);
  if (!design) return;
  const layers = design.layers || [];
  const index = layers.findIndex(function (item) { return item.id === ctx.params[1]; });
  if (index < 0) {
    ctx.fail(404, "图层不存在");
    return;
  }
  const direction = String((ctx.body || {}).direction || "up");
  let target = index;
  if (direction === "up") target = Math.min(layers.length - 1, index + 1);
  else if (direction === "down") target = Math.max(0, index - 1);
  else if (direction === "top") target = layers.length - 1;
  else if (direction === "bottom") target = 0;
  else {
    ctx.fail(400, "移动方向无效", "direction");
    return;
  }
  const item = layers.splice(index, 1)[0];
  layers.splice(target, 0, item);
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "图层", "调整层级", design.name, item.name + " " + direction, ctx.req);
  ctx.ok({ layers: layers });
}

function align(ctx) {
  const design = findDesign(ctx);
  if (!design) return;
  const body = ctx.body || {};
  const mode = String(body.mode || "");
  if (MODES.indexOf(mode) < 0) {
    ctx.fail(400, "对齐方式无效", "mode");
    return;
  }
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const layers = (design.layers || []).filter(function (item) { return ids.indexOf(item.id) >= 0; });
  if (layers.length < 2) {
    ctx.fail(400, "至少选择两个图层");
    return;
  }
  const aligned = layout.alignLayers(layers, mode);
  aligned.forEach(function (item) {
    const layer = design.layers.find(function (row) { return row.id === item.id; });
    layer.x = item.x;
    layer.y = item.y;
  });
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "排版", "对齐图层", design.name, mode + " " + aligned.length + "个", ctx.req);
  ctx.ok({ layers: design.layers });
}

function adapt(ctx) {
  const design = findDesign(ctx);
  if (!design) return;
  const body = ctx.body || {};
  const targetWidth = Number(body.targetWidth);
  const targetHeight = Number(body.targetHeight);
  if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth < 100 || targetWidth > 10000 || targetHeight < 100 || targetHeight > 10000) {
    ctx.fail(400, "目标尺寸应在100到10000像素之间", "targetWidth");
    return;
  }
  const fromWidth = design.width;
  const fromHeight = design.height;
  design.layers = layout.scaleLayers(design.layers || [], fromWidth, fromHeight, targetWidth, targetHeight);
  design.width = targetWidth;
  design.height = targetHeight;
  design.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "排版", "多尺寸适配", design.name, fromWidth + "x" + fromHeight + "→" + targetWidth + "x" + targetHeight, ctx.req);
  ctx.ok({ design: design });
}

module.exports = {
  FONTS: FONTS,
  validateLayer: validateLayer,
  list: list,
  create: create,
  update: update,
  remove: remove,
  move: move,
  align: align,
  adapt: adapt
};
