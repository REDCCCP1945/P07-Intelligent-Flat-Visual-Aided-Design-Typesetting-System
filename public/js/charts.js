const Charts = {
  palette: ["#4c8dff", "#27d3c0", "#e0a43a", "#ef6b6b", "#8b7cf6", "#5fb3d9"],
  empty: function (text) {
    return '<div class="chart-empty">' + UI.esc(text || "暂无数据") + "</div>";
  },
  donut: function (items, options) {
    const list = (items || []).filter(function (item) { return Number(item.value) > 0; });
    if (!list.length) return Charts.empty((options && options.emptyText) || "暂无数据");
    const total = list.reduce(function (sum, item) { return sum + Number(item.value); }, 0);
    const radius = 68;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    let circles = "";
    list.forEach(function (item, index) {
      const ratio = Number(item.value) / total;
      const color = item.color || Charts.palette[index % Charts.palette.length];
      circles += '<circle cx="100" cy="100" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="22" stroke-dasharray="' +
        (ratio * circumference).toFixed(2) + " " + circumference.toFixed(2) + '" stroke-dashoffset="' + (-offset * circumference).toFixed(2) +
        '" transform="rotate(-90 100 100)"/>';
      offset += ratio;
    });
    const inner = '<text x="100" y="96" text-anchor="middle" font-size="11" fill="#8b9aab">合计</text>' +
      '<text x="100" y="120" text-anchor="middle" font-size="20" font-family="SimHei" fill="#ffffff">' + UI.fmtInt(total) + "</text>";
    const legend = '<div class="legend">' + list.map(function (item, index) {
      return '<span><i style="background:' + (item.color || Charts.palette[index % Charts.palette.length]) + '"></i>' + UI.esc(item.name) + " " + UI.fmtInt(item.value) + "</span>";
    }).join("") + "</div>";
    return '<div class="chart" style="max-width:260px;margin:0 auto"><svg viewBox="0 0 200 200">' + circles + inner + "</svg></div>" + legend;
  },
  hbars: function (items, options) {
    const list = (items || []).filter(function (item) { return Number(item.value) > 0; });
    if (!list.length) return Charts.empty((options && options.emptyText) || "暂无数据");
    const max = Math.max.apply(null, list.map(function (item) { return Number(item.value); }));
    return list.map(function (item, index) {
      const width = max === 0 ? 0 : (Number(item.value) / max) * 100;
      return '<div style="margin-bottom:12px"><div class="row between" style="font-size:12px;color:#a7b7c8"><span>' + UI.esc(item.name) +
        '</span><span>' + UI.fmtInt(item.value) + '</span></div><div class="progress" style="margin-top:5px"><i style="width:' +
        Math.max(2, width).toFixed(1) + '%;background:' + Charts.palette[index % Charts.palette.length] + '"></i></div></div>';
    }).join("");
  }
};
