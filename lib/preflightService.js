const store = require("./store");
const audit = require("./audit");
const layout = require("./layoutService");

function analyze(design) {
  const background = design.background || "#FFFFFF";
  const rgb = layout.hexToRgb(background);
  const cmyk = layout.rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const ink = layout.totalInk(cmyk);
  const textLayers = (design.layers || []).filter(function (item) { return item.type === "text"; });
  let minContrast = layout.contrastRatio(background, "#FFFFFF");
  if (!textLayers.length) minContrast = 21;
  textLayers.forEach(function (layer) {
    const ratio = layout.contrastRatio(layer.fill || "#000000", background);
    minContrast = Math.min(minContrast, ratio);
  });
  const contrastScore = layout.clamp(Math.round(Number(minContrast) / 7 * 100), 0, 100);
  const verdict = layout.preflightVerdict(design.dpi, ink, design.bleed);
  const score = Math.round(contrastScore * 0.4 + verdict.inkScore * 0.4 + verdict.dpiScore * 0.2);
  let conclusion = "对比度、总墨量与分辨率均满足规则，可进入导出。";
  if (!verdict.pass) {
    conclusion = "预检未通过：请检查DPI是否达到300、总墨量是否不超过300%、出血是否不少于3毫米。";
  } else if (score < 70) {
    conclusion = "预检通过但得分偏低，建议提高文字与背景对比度。";
  }
  return {
    width: design.width,
    height: design.height,
    dpi: design.dpi,
    bleed: design.bleed,
    background: background,
    cmyk: cmyk,
    totalInk: ink,
    minContrast: minContrast,
    contrastLevel: layout.contrastLevel(Number(minContrast)),
    contrastScore: contrastScore,
    inkScore: verdict.inkScore,
    dpiScore: verdict.dpiScore,
    pass: verdict.pass,
    score: score,
    conclusion: conclusion
  };
}

function list(ctx) {
  const query = ctx.query;
  const keyword = (query.get("keyword") || "").trim();
  const designId = query.get("designId") || "";
  let rows = store.db.preflights.slice();
  if (keyword) rows = rows.filter(function (item) { return (item.designName + item.conclusion).indexOf(keyword) >= 0; });
  if (designId) rows = rows.filter(function (item) { return item.designId === designId; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(50, Math.max(5, Number(query.get("size") || 10)));
  ctx.ok({
    total: rows.length,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size),
    summary: {
      total: store.db.preflights.length,
      average: store.db.preflights.length ? Math.round(store.db.preflights.reduce(function (sum, item) { return sum + item.score; }, 0) / store.db.preflights.length) : 0,
      passed: store.db.preflights.filter(function (item) { return item.pass; }).length,
      designs: store.db.designs.length
    }
  });
}

function detail(ctx) {
  const row = store.db.preflights.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "预检记录不存在");
    return;
  }
  const design = store.db.designs.find(function (item) { return item.id === row.designId; });
  ctx.ok({ preflight: row, design: design || null });
}

function generate(ctx) {
  const body = ctx.body || {};
  const design = store.db.designs.find(function (item) { return item.id === body.designId; });
  if (!design) {
    ctx.fail(404, "项目不存在");
    return;
  }
  const result = analyze(design);
  const row = Object.assign({
    id: store.id("PRE"),
    designId: design.id,
    designName: design.name,
    createdAt: store.now()
  }, result);
  store.db.preflights.unshift(row);
  store.save();
  audit.write(ctx.user, "预检", "生成预检", row.id, design.name, ctx.req);
  ctx.ok({ preflight: row });
}

function exportJson(ctx) {
  const row = store.db.preflights.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "预检记录不存在");
    return;
  }
  audit.write(ctx.user, "预检", "导出JSON", row.id, row.designName, ctx.req);
  ctx.ok({ filename: row.id + ".json", content: JSON.stringify(row, null, 2), type: "application/json" });
}

function exportCsv(ctx) {
  const row = store.db.preflights.find(function (item) { return item.id === ctx.params[0]; });
  if (!row) {
    ctx.fail(404, "预检记录不存在");
    return;
  }
  const header = ["预检编号", "项目", "画布", "DPI", "出血mm", "CMYK", "总墨量", "最小对比度", "对比等级", "综合分", "结论", "生成时间"];
  const cmyk = row.cmyk.c + "/" + row.cmyk.m + "/" + row.cmyk.y + "/" + row.cmyk.k;
  const line = [row.id, row.designName, row.width + "x" + row.height, row.dpi, row.bleed, cmyk, row.totalInk, row.minContrast, row.contrastLevel, row.score, row.conclusion, row.createdAt];
  audit.write(ctx.user, "预检", "导出CSV", row.id, row.designName, ctx.req);
  ctx.ok({
    filename: row.id + ".csv",
    content: header.join(",") + "\r\n" + line.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(","),
    type: "text/csv"
  });
}

module.exports = {
  analyze: analyze,
  list: list,
  detail: detail,
  generate: generate,
  exportJson: exportJson,
  exportCsv: exportCsv
};
