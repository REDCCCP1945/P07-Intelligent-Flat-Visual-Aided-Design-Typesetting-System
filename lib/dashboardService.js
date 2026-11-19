const store = require("./store");

function summary(ctx) {
  const designs = store.db.designs;
  const preflights = store.db.preflights;
  const categories = {};
  designs.forEach(function (item) {
    const template = store.db.templates.find(function (row) { return row.id === item.templateId; });
    const key = template ? template.category : "custom";
    categories[key] = (categories[key] || 0) + 1;
  });
  let layerTotal = 0;
  designs.forEach(function (item) { layerTotal += (item.layers || []).length; });
  ctx.ok({
    designCount: designs.length,
    activeDesigns: designs.filter(function (item) { return item.status === "active"; }).length,
    paletteCount: store.db.palettes.filter(function (item) { return item.enabled; }).length,
    templateCount: store.db.templates.length,
    preflightCount: preflights.length,
    averageScore: preflights.length ? Math.round(preflights.reduce(function (sum, item) { return sum + item.score; }, 0) / preflights.length) : 0,
    versionCount: store.db.versions.length,
    layerTotal: layerTotal,
    pendingFeedback: store.db.feedback.filter(function (item) { return item.status === "pending"; }).length,
    categories: categories,
    recentDesigns: designs.slice(0, 6).map(function (item) {
      return { id: item.id, name: item.name, width: item.width, height: item.height, layerCount: (item.layers || []).length, updatedAt: item.updatedAt };
    }),
    recentPreflights: preflights.slice(0, 5)
  });
}

module.exports = { summary: summary };
